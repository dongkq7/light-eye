import { BaseTransport, type TransportOptions } from '@light-eye/core'

// 重试队列
interface RetryItem {
  data: any[] // 数据
  type: string // 类型
  retries: number // 重试次数
}

export class BrowserTransport extends BaseTransport {
  private retryQueue: RetryItem[] = [] // 重试队列
  private currentRetry: RetryItem | null = null // 当前重试Item
  private retryTimeout: number | null = null // 保存重试定时器ID

  private handleBeforeUnload = () => this.flushWithBeacon()
  private handleVisibilityChange = () => this.handlePageHidden()

  constructor(options: TransportOptions) {
    super(options)
    this.setupEventListeners()
  }

  /**
   * 发送单条数据，统一进入缓存池
   */
  send(data: any): void {
    this.sendData(data)
  }

  /**
   * 发送所有缓存的数据
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // 获取所有缓存类型并发送
    const cacheTypes = Array.from(this.cachePool.getCache().keys())

    for (const type of cacheTypes) {
      await this.flushType(type)
    }

    // 触发重试
    if (this.retryQueue.length > 0) {
      this.scheduleRetry()
    }
  }

  protected async sendBatch(data: any[], type: string): Promise<void> {
    if (this.isSending) {
      // 如果正在发送，数据重新放回缓存
      this.cachePool.addBatchCache(type, data)
      return
    }

    this.isSending = true

    try {
      const response = await fetch(this.options.dsn, {
        method: 'POST',
        body: JSON.stringify(this.formatPayload(data, type)),
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': this.generateRequestId()
        },
        keepalive: data.length <= 5 // 少量数据使用keepalive
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      this.isSending = false
    } catch (error) {
      this.isSending = false
      this.handleSendError(data, type)
    }
  }

  /**
   * 处理发送失败，注入
   */
  private handleSendError(data: any[], type: string): void {
    const existingItem = this.retryQueue.find(item => item.type === type)
    if (existingItem) {
      existingItem.data.push(...data) // 合并同类型失败数据
    } else {
      this.retryQueue.push({ data, type, retries: 0 })
    }

    this.scheduleRetry()
  }

  /**
   * 调度重试（添加指数退避策略）
   */
  private async scheduleRetry(): Promise<void> {
    if (this.isSending || this.retryQueue.length === 0) return
    const [retryItem] = this.retryQueue
    if (!retryItem) return

    if (retryItem.retries >= this.options.maxRetries) {
      this.retryQueue.shift()
      this.saveToLocalStorage(retryItem.data, retryItem.type)
      this.scheduleRetry() // 处理下一个

      return
    }

    this.currentRetry = retryItem
    const delay = 1000 * Math.pow(2, retryItem.retries) // 指数退避

    await new Promise<void>(resolve => {
      this.retryTimeout = window.setTimeout(() => {
        resolve()
      }, delay)
    })

    try {
      retryItem.retries++
      await this.sendBatch(retryItem.data, retryItem.type)
      // 成功，移除
      this.retryQueue.shift()
    } catch (error) {
      // 失败，重新添加到队列，等待下次重试
      this.retryQueue.unshift(this.currentRetry)
      console.warn(`⚠️ Retry ${retryItem.retries}/${this.options.maxRetries} failed`)
    } finally {
      this.currentRetry = null
      this.retryTimeout = null
      this.scheduleRetry()
    }
  }

  private saveToLocalStorage(data: any[], type: string): void {
    try {
      const key = 'light_eye_failed_reports'
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify([...existing, { type, data }]))
    } catch (e) {
      console.error('Failed to save reports:', e)
    }
  }

  /**
   * 页面隐藏触发上报
   */
  private handlePageHidden(): void {
    if (document.visibilityState === 'hidden') {
      this.flush()
    }
  }

  /**
   * 页面卸载时使用 sendBeacon发送
   */
  private flushWithBeacon(): void {
    if (this.cachePool.getSize() === 0) return

    const allCache = this.cachePool.getCache()

    Array.from(allCache.entries()).forEach(([type, data]) => {
      if (data.length > 0 && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(this.formatPayload(data, type))], { type: 'application/json' })

        navigator.sendBeacon(this.options.dsn, blob)
        this.cachePool.clearTypeCache(type)
      }
    })
  }

  /**
   * 初始化事件监听器（页面卸载/隐藏时触发上报）
   */
  private setupEventListeners(): void {
    window.addEventListener('beforeunload', this.handleBeforeUnload)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * 格式化发送 payload
   */
  private formatPayload(data: any[], type: string): object {
    return {
      event_type: type,
      data,
      timestamp: Date.now(),
      count: data.length
    }
  }

  /**
   * 销毁实例（清理定时器、事件监听器）
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
    // 移除事件监听器（必须与添加时的函数引用一致）
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.retryQueue = [] // 清空重试队列
  }
}
