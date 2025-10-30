import type { Transport, TransportOptions } from '../types'
import { cachePool, type ICachePool } from '@light-eye/utils'

export abstract class BaseTransport implements Transport {
  protected options: Required<TransportOptions>
  protected cachePool: ICachePool
  protected flushTimer: number | null = null
  protected isSending = false

  constructor(options: TransportOptions) {
    this.options = {
      bufferSize: 10,
      bufferDelay: 1000,
      maxRetries: 3,
      useBatch: true,
      ...options
    }

    this.cachePool = cachePool
  }

  abstract send(data: any): void
  abstract flush(): Promise<void>
  abstract destroy(): void

  /**
   * 发送数据 - 统一使用CachePool
   */
  protected sendData(data: any): void {
    const eventType = data.event_type || 'default'

    // 添加到缓存池
    this.cachePool.addCache(eventType, data)

    if (this.options.useBatch) {
      // 批量模式：检查是否达到阈值或设置定时器
      this.checkAndScheduleFlush(eventType)
    } else {
      // 实时模式：立即发送
      this.flushType(eventType)
    }
  }

  /**
   * 检查并调度刷新
   */
  protected checkAndScheduleFlush(type: string): void {
    const currentSize = this.cachePool.getSize(type)

    // 达到阈值立即发送
    if (currentSize >= this.options.bufferSize) {
      this.flushType(type)
      return
    }

    // 设置延迟发送
    if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => {
        this.flush()
      }, this.options.bufferDelay)
    }
  }

  /**
   * 刷新指定类型的数据
   */
  protected async flushType(type: string): Promise<void> {
    const data = this.cachePool.takeCache(type)
    if (data.length > 0 && !this.isSending) {
      await this.sendBatch(data, type)
    }
  }

  /**
   * 发送批次数据
   */
  protected abstract sendBatch(data: any[], type: string): Promise<void>

  protected generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }
}
