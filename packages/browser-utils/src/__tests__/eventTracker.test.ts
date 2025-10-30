import {
  clearEvents,
  defaultEventTracker,
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

describe('EventTracker', () => {
  let tracker: EventTracker

  beforeEach(() => {
    tracker = new EventTracker()
    tracker.destroy()
    ;(getElementSelector as jest.Mock).mockClear()
  })

  // 测试默认配置
  test('should use default config when no custom config is provided', () => {
    expect(tracker.getConfig()).toEqual({
      enabled: true,
      timeout: 5000,
      meaningfulEvents: [
        'click',
        'mousedown',
        'keydown',
        'keyup',
        'submit',
        'change',
        'input',
        'touchstart',
        'touchend'
      ],
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

  // 测试初始化逻辑
  test('should initialize event listeners when init() is called', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
    tracker.init()
    expect(tracker.getConfig().enabled).toBe(true)
    expect(tracker['isInitialized']).toBe(true)
    expect(addEventListenerSpy).toHaveBeenCalledTimes(tracker.getConfig()!.captureEvents!.length)
    // 恢复被模拟的原生方法
    addEventListenerSpy.mockRestore()
  })

  // 测试事件捕获记录
  test('should track meaningful events and ignore non-meaningful ones', () => {
    tracker.init()

    const clickEvent = new Event('click')
    document.dispatchEvent(clickEvent)

    // 触发一个无意义的事件
    const scrollEvent = new Event('scroll')
    document.dispatchEvent(scrollEvent)

    expect(tracker.getLastEvent()?.type).toBe('click')
    expect(tracker.getRecentEvents().length).toBe(1)
    expect(tracker.getStats().totalEvents).toBe(1)
  })

  // 测试事件过期清理
  test('should cleanup expired events based on timeout', () => {
    tracker = new EventTracker({ timeout: 100 })
    tracker.init()

    const clickEvent = new Event('click')
    document.dispatchEvent(clickEvent)
    // 快进时间（Jest 时间模拟）
    jest.useFakeTimers()
    jest.advanceTimersByTime(200) // 超过 100ms 超时时间
    // 验证过期事件被清理
    expect(tracker.getLastEvent()).toBeNull()
    expect(tracker.getRecentEvents().length).toBe(0)
    jest.useRealTimers()
  })

  // 测试事件数量限制
  test('should limit events to maxEvents config', () => {
    // 限制最大事件数为 2
    tracker = new EventTracker({ maxEvents: 2 })
    tracker.init()

    // 触发 3 个事件
    document.dispatchEvent(new Event('click'))
    document.dispatchEvent(new Event('keydown'))
    document.dispatchEvent(new Event('submit'))

    // 验证只保留最新的 2 个
    expect(tracker.getRecentEvents().length).toBe(2)
    expect(tracker.getRecentEvents()![0]?.type).toBe('submit') // 最新的事件在最前
    expect(tracker.getRecentEvents()![1]?.type).toBe('keydown')
  })

  // 测试获取最近事件的格式化输出
  test('should format recent events with type, timestamp and target', () => {
    tracker.init()

    const button = document.createElement('button')
    button.id = 'test-btn'
    document.body.appendChild(button)

    // const clickEvent = new MouseEvent('click')

    // button.dispatchEvent(clickEvent)
    // 1. 创建基础事件（不指定 target）
    const clickEvent = new MouseEvent('click', {
      bubbles: true, // 可选：根据需要设置事件是否冒泡
      cancelable: true
    })

    // 2. 手动给事件对象添加 target 属性（绕开类型检查）
    Object.defineProperty(clickEvent, 'target', {
      value: button,
      writable: false // 模拟浏览器中 target 的只读特性
    })

    // 触发事件
    document.dispatchEvent(clickEvent)
    const recentEvents = tracker.getRecentEvents()
    expect(recentEvents[0]!.type).toBe('click')
    expect(recentEvents[0]!.target).toBe('button#test-btn') // 验证 getElementSelector 被调用
    expect(typeof recentEvents[0]!.timestamp).toBe('number')

    document.body.removeChild(button)
  })

  // 测试禁用状态
  test('should not track events when enabled is false', () => {
    tracker = new EventTracker({ enabled: false })
    tracker.init()

    document.dispatchEvent(new Event('click'))
    expect(tracker.getLastEvent()).toBeNull()
    expect(tracker.getStats().enabled).toBe(false)
    expect(tracker.getRecentEvents().length).toBe(0)
  })

  // 测试清空事件
  test('should clear all events when clear() is called', () => {
    tracker.init()
    document.dispatchEvent(new Event('click'))
    expect(tracker.getLastEvent()).not.toBeNull()

    tracker.clear()
    expect(tracker.getLastEvent()).toBeNull()
    expect(tracker.getRecentEvents().length).toBe(0)
  })

  // 测试更新配置
  test('should update config when updateConfig() is called', () => {
    tracker.updateConfig({ enabled: false, timeout: 10000 })
    expect(tracker.getConfig().enabled).toBe(false)
    expect(tracker.getConfig().timeout).toBe(10000)
  })
  // 测试默认实例及便捷函数
  test('should work with default instance and utility functions', () => {
    // 重置默认实例
    defaultEventTracker.destroy()
    defaultEventTracker.init()

    // 用便捷函数触发事件并验证
    document.dispatchEvent(new Event('keydown'))
    expect(getLastEvent()?.type).toBe('keydown')
    expect(getRecentEvents()[0]!.type).toBe('keydown')
    expect(getEventTrackerStats().totalEvents).toBe(1)

    clearEvents()
    expect(getLastEvent()).toBeNull()
  })

  // 测试 initEventTracker 工厂函数
  test('should create a new tracker with custom config via initEventTracker', () => {
    const customTracker = initEventTracker({ maxEvents: 5 })
    expect(customTracker.getConfig().maxEvents).toBe(5)
    expect(customTracker['isInitialized']).toBe(true)

    const customTrackerDefaultConfig = initEventTracker()
    expect(customTrackerDefaultConfig.getConfig().maxEvents).toBe(10)
  })
})
