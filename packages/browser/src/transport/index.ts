import { BaseTransport, type TransportOptions } from '@light-eye/core'

export class BrowserTransport extends BaseTransport {
  private retryQueue: { data: any[]; type: string; retries: number }[] = []

  constructor(options: TransportOptions) {
    super(options)
    this.setupEventListeners()
  }

  send(data: any): void {
    this.sendData(data)
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // 获取所有缓存类型并发送
    const cacheTypes = Array.from(this.cachePool.getCache().keys())

    for (const type of cacheTypes) {
      const data = this.cachePool.takeCache(type)
      if (data.length > 0) {
        await this.sendBatch(data, type)
      }
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
        body: JSON.stringify({
          event_type: type,
          data,
          timestamp: Date.now(),
          count: data.length
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': this.generateRequestId()
        },
        keepalive: data.length <= 5 // 少量数据使用keepalive
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      this.handleRetry(data, type)
    } finally {
      this.isSending = false
    }
  }

  private handleRetry(data: any[], type: string): void {
    if (this.retryQueue.length < this.options.maxRetries) {
      this.retryQueue.push({
        data,
        type,
        retries: 0
      })

      this.scheduleRetry()
    } else {
      // 超过重试次数，保存到本地存储
      this.saveToLocalStorage(data, type)
    }
  }

  private scheduleRetry(): void {
    if (this.isSending || this.retryQueue.length === 0) return

    const retryItem = this.retryQueue[0]!
    if (retryItem.retries >= this.options.maxRetries) {
      this.retryQueue.shift()
      this.saveToLocalStorage(retryItem.data, retryItem.type)
      this.scheduleRetry()
      return
    }

    const delay = 1000 * Math.pow(2, retryItem.retries) // 指数退避
    setTimeout(async () => {
      if (this.retryQueue.length > 0 && this.retryQueue[0] === retryItem) {
        retryItem.retries++
        await this.sendBatch(retryItem.data, retryItem.type)
        this.retryQueue.shift()
      }
    }, delay)
  }

  private saveToLocalStorage(data: any[], type: string): void {
    try {
      const key = 'light_eye_failed_reports'
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify([...existing, { type, data }]))
      console.warn(`数据保存到本地存储: ${data.length}条${type}数据`)
    } catch (e) {
      console.error('本地存储失败:', e)
    }
  }

  private setupEventListeners(): void {
    // 页面卸载时上报数据
    window.addEventListener('beforeunload', () => {
      if (this.cachePool.getSize() > 0) {
        // 使用sendBeacon确保页面卸载时能发送
        this.flushWithBeacon()
      }
    })

    // 页面隐藏时上报
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush()
      }
    })
  }

  private flushWithBeacon(): void {
    const allCache = this.cachePool.getCache()

    Object.entries(allCache).forEach(([type, data]) => {
      if (data.length > 0 && navigator.sendBeacon) {
        const blob = new Blob(
          [
            JSON.stringify({
              type,
              data,
              timestamp: Date.now()
            })
          ],
          { type: 'application/json' }
        )

        navigator.sendBeacon(this.options.dsn, blob)
        this.cachePool.clearTypeCache(type)
      }
    })
  }

  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // 移除事件监听器
    window.removeEventListener('beforeunload', this.flushWithBeacon)
    document.removeEventListener('visibilitychange', this.flush)
  }
}
