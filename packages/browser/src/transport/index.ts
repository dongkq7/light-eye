import type { Transport, TransportOptions } from '@light-eye/core'
import { cachePool } from '@light-eye/utils'

export class BrowserTransport implements Transport {
  private options: Required<TransportOptions>
  private lazyTimer: number | null = null

  private handleBeforeUnload = () => this.flushWithBeacon()

  constructor(options: TransportOptions) {
    this.options = {
      useBatch: true,
      lazyTimeout: 3000,
      bufferSize: 10,
      ...options
    }
    this.setupEventListeners()
  }

  /**
   * 唯一发送方法
   */
  send(data: any): void {
    if (this.options.useBatch) {
      this.sendBatch(data)
    } else {
      this.sendRealTime(data)
    }
  }

  /**
   * 批量发送
   */
  private sendBatch(data: any): void {
    const eventType = data.event_type || 'unknown'

    cachePool.addCache(eventType, data)

    if (cachePool.getSize(eventType) >= this.options.bufferSize) {
      this.flushCacheType(eventType)
      return
    }

    this.scheduleLazyFlush()
  }

  /**
   * 实时发送
   */
  private sendRealTime(data: any): void {
    const reportData = this.formatPayload(data, data.event_type)
    this.sendBeacon(reportData)
  }

  /**
   * 调度延迟刷新
   */
  private scheduleLazyFlush(): void {
    if (this.lazyTimer) {
      clearTimeout(this.lazyTimer)
    }
    this.lazyTimer = window.setTimeout(() => {
      this.flushAllCache()
    }, this.options.lazyTimeout)
  }

  /**
   * 刷新指定类型的缓存数据
   */
  private flushCacheType(type: string): void {
    const data = cachePool.takeCache(type)
    if (data.length === 0) return

    const reportData = this.formatPayload(data, type)
    this.sendBeacon(reportData)
  }

  /**
   * 刷新所有缓存数据
   */
  private flushAllCache(): void {
    const allData = cachePool.getAllCacheData()
    allData.forEach(([type, data]) => {
      if (data.length > 0) {
        const reportData = this.formatPayload(data, type)
        this.sendBeacon(reportData)
      }
    })
    cachePool.clearCache()
  }

  /**
   * 页面卸载时发送所有缓存数据
   */
  private flushWithBeacon(): void {
    const allData: any[] = []

    const allCache = cachePool.getAllCacheData()
    allCache.forEach(([type, data]) => {
      if (data.length > 0) {
        allData.push(...data)
      }
    })

    if (allData.length > 0) {
      const reportData = this.formatPayload(allData, 'batch')
      this.sendBeacon(reportData)
    }
  }

  /**
   * 使用 sendBeacon 发送
   */
  private sendBeacon(data: any): void {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      navigator.sendBeacon(this.options.dsn, blob)
    } else {
      this.sendWithXHR(data)
    }
    // fetch(this.options.dsn, {
    //   method: 'POST',
    //   body: JSON.stringify(data),
    //   headers: {
    //     'Content-Type': 'application/json'
    //   }
    // }).catch(error => {
    //   console.error('上报失败:', error)
    // })
  }

  /**
   * XMLHttpRequest
   */
  private sendWithXHR(data: any): void {
    try {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', this.options.dsn, true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.send(JSON.stringify(data))
    } catch (error) {
      // 失败就失败
    }
  }

  /**
   * 数据格式化
   */
  private formatPayload(data: any[], type: string): any {
    return {
      id: this.generateRequestId(),
      timestamp: Date.now(),
      event_type: type || 'unknown',
      data: [data],
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        referrer: document.referrer,
        path: location.pathname
      }
    }
  }

  /**
   * 工具方法
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
  }

  /**
   * 事件监听器
   */
  private setupEventListeners(): void {
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.lazyTimer) {
      window.clearTimeout(this.lazyTimer)
      this.lazyTimer = null
    }
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    cachePool.clearCache()
  }
}
