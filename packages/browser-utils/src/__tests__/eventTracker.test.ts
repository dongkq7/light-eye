import {
  clearEvents,
  EventTracker,
  getEventTrackerStats,
  getLastEvent,
  getRecentEvents,
  initEventTracker
} from '../eventTracker'
import { getElementSelector } from '../paths'

jest.mock('../paths', () => ({
  getElementSelector: jest.fn(el => {
    if (!el) return ''
    let selector = el.tagName?.toLowerCase() || ''
    if (el.id) {
      selector += `#${el.id}`
    }
    if (el.className) {
      selector += `.${(el.className as string).replace(/\s+/g, '.')}`
    }
    return selector
  })
}))

describe('EventTracker (Singleton)', () => {
  // 单例模式下，通过 getInstance 获取实例
  const getTracker = () => EventTracker.getInstance()

  // 每次测试前重置单例和状态
  beforeEach(() => {
    // 调用 destroy 重置单例
    getTracker().destroy()
    // 重新获取实例（确保是新实例）
    const newTracker = getTracker()
    // 手动清空事件
    newTracker.clear()
    // 验证初始状态为空
    expect(newTracker.getRecentEvents().length).toBe(0)
    ;(getElementSelector as jest.Mock).mockClear()
    jest.clearAllMocks()
  })

  // 测试单例唯一性
  test('should be a singleton (only one instance)', () => {
    const tracker1 = EventTracker.getInstance()
    const tracker2 = EventTracker.getInstance()
    expect(tracker1).toBe(tracker2) // 同一实例
  })

  // 测试默认配置
  test('should use default config when no custom config is provided', () => {
    const tracker = getTracker()
    expect(tracker.getConfig()).toEqual({
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
    })
  })

  // 测试初始化逻辑（防止重复初始化）
  test('should initialize event listeners only once', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
    const tracker = getTracker()

    tracker.init()
    tracker.init() // 第二次调用应被忽略
    expect(tracker['isInitialized']).toBe(true)
    // 验证事件监听只绑定一次（次数等于 captureEvents 长度）
    expect(addEventListenerSpy).toHaveBeenCalledTimes(tracker.getConfig()!.captureEvents!.length)
    addEventListenerSpy.mockRestore()
  })

  // 测试事件捕获记录
  test('should track all events in captureEvents', () => {
    const tracker = EventTracker.getInstance({
      captureEvents: ['click', 'scroll']
    })
    tracker.init()

    // 触发事件
    document.dispatchEvent(new Event('click'))
    document.dispatchEvent(new Event('scroll'))

    // 此时只会记录这两个事件
    expect(tracker.getRecentEvents().length).toBe(2)
    expect(tracker.getRecentEvents()[0]!.type).toBe('scroll')
    expect(tracker.getRecentEvents()[1]!.type).toBe('click')
  })

  test('should only track events in custom captureEvents', () => {
    // 自定义配置：只监听 click 事件
    const tracker = EventTracker.getInstance({
      captureEvents: ['click']
    })
    tracker.init()

    // 触发 click（会被记录）和 scroll（不在配置中，不记录）
    document.dispatchEvent(new Event('click'))
    document.dispatchEvent(new Event('scroll'))

    expect(tracker.getRecentEvents().length).toBe(1)
    expect(tracker.getLastEvent()?.type).toBe('click')
  })

  // 测试事件过期清理
  test('should cleanup expired events based on timeout', () => {
    // 通过 getInstance 传入自定义配置（超时 100ms）
    const tracker = EventTracker.getInstance({ timeout: 100 })
    tracker.init()

    document.dispatchEvent(new Event('click'))
    jest.useFakeTimers()
    jest.advanceTimersByTime(200) // 超过超时时间
    expect(tracker.getLastEvent()).toBeNull() // 事件已过期
    expect(tracker.getRecentEvents().length).toBe(0)
    jest.useRealTimers()
  })

  // 测试事件数量限制
  test('should limit events to maxEvents config', () => {
    const tracker = EventTracker.getInstance({ maxEvents: 2 })
    tracker.init()

    // 触发 3 个事件
    document.dispatchEvent(new Event('click'))
    document.dispatchEvent(new Event('keydown'))
    document.dispatchEvent(new Event('submit'))

    // 只保留最新的 2 个
    expect(tracker.getRecentEvents().length).toBe(2)
    expect(tracker.getRecentEvents()[0]!.type).toBe('submit') // 最新事件在最前
    expect(tracker.getRecentEvents()[1]!.type).toBe('keydown')
  })

  // 测试最近事件的格式化输出
  test('should format recent events with type, timestamp and target', () => {
    const tracker = getTracker()
    tracker.init()

    const button = document.createElement('button')
    button.id = 'test-btn'
    document.body.appendChild(button)

    // 触发带 target 的点击事件
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: button })
    document.dispatchEvent(clickEvent)

    const recentEvents = tracker.getRecentEvents()
    expect(recentEvents[0]!.type).toBe('click')
    expect(recentEvents[0]!.target).toBe('button#test-btn') // 匹配 selector 逻辑
    expect(typeof recentEvents[0]!.timestamp).toBe('number')

    document.body.removeChild(button)
  })

  // 测试禁用状态
  test('should not track events when enabled is false', () => {
    const tracker = EventTracker.getInstance({ enabled: false })
    tracker.init()

    document.dispatchEvent(new Event('click'))
    expect(tracker.getRecentEvents().length).toBe(0)
    expect(tracker.getLastEvent()).toBeNull()
    expect(tracker.getStats().enabled).toBe(false)
  })

  // 测试清空事件
  test('should clear all events when clear() is called', () => {
    const tracker = getTracker()
    tracker.init()
    document.dispatchEvent(new Event('click'))
    expect(tracker.getLastEvent()).not.toBeNull()

    clearEvents() // 调用便捷函数
    expect(tracker.getLastEvent()).toBeNull()
    expect(tracker.getRecentEvents().length).toBe(0)
  })

  // 测试更新配置
  test('should update config when updateConfig() is called', () => {
    const tracker = getTracker()
    tracker.updateConfig({ enabled: false, timeout: 10000 })
    expect(tracker.getConfig().enabled).toBe(false)
    expect(tracker.getConfig().timeout).toBe(10000)
  })

  // 测试便捷函数与单例的一致性
  test('utility functions should work with the singleton instance', () => {
    initEventTracker() // 初始化单例

    document.dispatchEvent(new Event('keydown'))
    expect(getLastEvent()?.type).toBe('keydown') // 便捷函数获取单例数据
    expect(getRecentEvents()[0]!.type).toBe('keydown')
    expect(getEventTrackerStats().totalEvents).toBe(1)

    clearEvents()
    expect(getLastEvent()).toBeNull()
  })

  // 测试 initEventTracker 工厂函数（更新单例配置）
  test('initEventTracker should update singleton config', () => {
    // 第一次调用：创建单例并传入配置
    const tracker1 = initEventTracker({ maxEvents: 5 })
    expect(tracker1.getConfig().maxEvents).toBe(5)
    expect(tracker1['isInitialized']).toBe(true)

    // 第二次调用：更新单例配置
    const tracker2 = initEventTracker({ maxEvents: 8 })
    expect(tracker2.getConfig().maxEvents).toBe(8)
    expect(tracker1).toBe(tracker2) // 仍是同一个单例
  })
})
