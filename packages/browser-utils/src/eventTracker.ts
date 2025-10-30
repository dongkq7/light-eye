import type { EventTrackerConfig } from '@light-eye/core'
import { getElementSelector } from './paths'

// 默认配置
const DEFAULT_EVENT_TRACKER_CONFIG: Required<EventTrackerConfig> = {
  enabled: true,
  timeout: 5000,
  maxEvents: 10,
  captureEvents: [
    'click',
    'mousedown',
    'keydown',
    'keyup',
    'scroll',
    'mouseover',
    'mousewheel',
    'touchstart',
    'touchend',
    'input',
    'change',
    'submit',
    'focus',
    'blur'
  ]
}

class EventTracker {
  private lastEvents: Array<{ event: Event; timestamp: number }> = []
  private config: Required<EventTrackerConfig>
  private isInitialized = false
  private static instance: EventTracker | null = null
  // 缓存事件处理函数，确保添加/移除的是同一个
  private eventHandlers = new Map<string, (event: Event) => void>()

  constructor(config: EventTrackerConfig = {}) {
    this.config = {
      ...DEFAULT_EVENT_TRACKER_CONFIG,
      ...config
    }
  }

  static getInstance(config?: EventTrackerConfig): EventTracker {
    if (!EventTracker.instance) {
      EventTracker.instance = new EventTracker(config)
    } else if (config) {
      EventTracker.instance.updateConfig(config) // 允许更新配置
    }
    return EventTracker.instance
  }

  /**
   * 初始化事件追踪
   */
  init(): void {
    if (this.isInitialized || !this.config.enabled) {
      return
    }

    this.config.captureEvents.forEach(eventType => {
      const handler = (event: Event) => this.handleEvent(event)
      this.eventHandlers.set(eventType, handler)
      document.addEventListener(eventType, handler, {
        capture: true,
        passive: true
      })
    })

    this.isInitialized = true
    console.log('✅ Event tracker initialized with config:', this.config)
  }

  /**
   * 处理捕获的事件
   */
  private handleEvent(event: Event): void {
    // 清理过期事件
    this.cleanupExpiredEvents()

    this.lastEvents.unshift({
      event,
      timestamp: Date.now()
    })

    // 限制事件数量
    if (this.lastEvents.length > this.config.maxEvents) {
      this.lastEvents = this.lastEvents.slice(0, this.config.maxEvents)
    }
  }

  /**
   * 清理过期事件
   */
  private cleanupExpiredEvents(): void {
    const now = Date.now()
    this.lastEvents = this.lastEvents.filter(item => now - item.timestamp < this.config.timeout)
  }

  /**
   * 获取最后一个有意义的事件
   */
  getLastEvent(): Event | null {
    if (!this.config.enabled) return null

    this.cleanupExpiredEvents()
    return this.lastEvents[0]?.event || null
  }

  /**
   * 获取最近的事件序列
   */
  getRecentEvents(limit: number = 3): Array<{ type: string; timestamp: number; target?: string }> {
    if (!this.config.enabled) return []

    this.cleanupExpiredEvents()
    return this.lastEvents.slice(0, limit).map(item => ({
      type: item.event.type,
      timestamp: item.timestamp,
      target: getElementSelector(item.event.target as HTMLElement)
    }))
  }

  /**
   * 清空所有事件记录
   */
  clear(): void {
    this.lastEvents = []
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalEvents: number; enabled: boolean } {
    if (!this.config.enabled) {
      return { totalEvents: 0, enabled: false }
    }

    this.cleanupExpiredEvents()

    return {
      totalEvents: this.lastEvents.length,
      enabled: this.config.enabled
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<EventTrackerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取当前配置
   */
  getConfig(): EventTrackerConfig {
    return { ...this.config }
  }

  /**
   * 销毁事件追踪器
   */
  destroy(): void {
    this.eventHandlers.forEach((handler, eventType) => {
      document.removeEventListener(eventType, handler, { capture: true })
    })
    this.eventHandlers.clear()
    this.lastEvents = []
    this.isInitialized = false
    EventTracker.instance = null
  }
}

// 便捷函数
export const initEventTracker = (config?: EventTrackerConfig) => {
  const tracker = EventTracker.getInstance(config)
  tracker.init()
  return tracker
}

export const getLastEvent = () => EventTracker.getInstance().getLastEvent()
export const getRecentEvents = (limit?: number) => EventTracker.getInstance().getRecentEvents(limit)
export const clearEvents = () => EventTracker.getInstance().clear()
export const getEventTrackerStats = () => EventTracker.getInstance().getStats()
export { EventTracker }
