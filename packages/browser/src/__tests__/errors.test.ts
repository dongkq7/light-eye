import { Errors } from '../tracing/errors'
import { getLastEvent, getRecentEvents, getPaths, getElementSelector } from '@light-eye/browser-utils'

jest.mock('@light-eye/browser-utils', () => ({
  getLastEvent: jest.fn(),
  getRecentEvents: jest.fn(),
  getPaths: jest.fn(() => 'html > body > div'),
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

// 模拟Transport类来验证上报数据
class MockTransport {
  constructor(public sendData: any[] = []) {}
  send(data: any) {
    this.sendData.push(data)
  }
  flush() {
    this.sendData = []
    return Promise.resolve()
  }
  destroy() {}
}

describe('Errors', () => {
  let errors: Errors
  let transport: MockTransport

  beforeEach(() => {
    transport = new MockTransport()
    errors = new Errors(transport)
    errors.init()
    ;(getLastEvent as jest.Mock).mockClear()
    ;(getRecentEvents as jest.Mock).mockClear()
    ;(getPaths as jest.Mock).mockClear()
    ;(getElementSelector as jest.Mock).mockClear()
    transport.sendData = []
  })

  // 测试初始化后是否正确注册事件监听
  test('should register event listeners on init', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const mockErrors = new Errors(transport)

    mockErrors.init()

    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function), true)
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    addEventListenerSpy.mockRestore()
  })

  // 测试 JS 运行时错误捕获
  test('should capture JS runtime errors', () => {
    // 模拟用户行为事件
    ;(getLastEvent as jest.Mock).mockReturnValue({ type: 'click' } as Event)
    ;(getRecentEvents as jest.Mock).mockReturnValue([{ type: 'keydown' }])

    // 触发一个JS运行时错误
    const errorEvent = new ErrorEvent('error', {
      message: 'Test runtime error',
      filename: 'test.js',
      lineno: 5,
      colno: 23,
      error: new TypeError('Cannot read property')
    })

    window.dispatchEvent(errorEvent)

    // 验证上报数据
    expect(transport.sendData.length).toBe(1)
    const report = transport.sendData[0]
    expect(report.event_type).toBe('error')
    expect(report.type).toBe('js_runtime_error')
    expect(report.message).toBe('Test runtime error')
    expect(report.filename).toBe('test.js')
    expect(report.event_context.has_last_event).toBe(true)
    expect(report.event_context.recent_events).toEqual([{ type: 'keydown' }])
  })

  // 测试资源加载错误捕获
  test('should capture resource load errors', () => {
    // 模拟资源加载失败
    const img = document.createElement('img')
    img.id = 'test-img'
    img.src = 'invalid-image.png'
    document.body.appendChild(img)

    // 模拟用户行为事件
    ;(getRecentEvents as jest.Mock).mockReturnValue([])

    // 构造资源错误事件（通过 Object.defineProperty 绕开类型检查设置 target）
    const resourceErrorEvent = new ErrorEvent('error', {
      filename: 'invalid-image.png'
    })
    Object.defineProperty(resourceErrorEvent, 'target', { value: img })
    window.dispatchEvent(resourceErrorEvent)

    // 验证上报数据
    expect(transport.sendData.length).toBe(1)
    const report = transport.sendData[0]
    expect(report.type).toBe('resource_load_error')
    expect(report.tag_name).toBe('IMG')
    expect(report.resource_url).toBe('http://localhost/invalid-image.png')
    expect(report.message).toBe('获取IMG资源失败')

    // 清理DOM
    document.body.removeChild(img)
  })

  // 测试未处理的Promise错误
  test('should capture unhandled promise rejections', () => {
    ;(getRecentEvents as jest.Mock).mockReturnValue([{ type: 'click' }])

    const rejectionEvent = new Event('unhandledrejection') as PromiseRejectionEvent
    ;(rejectionEvent as any).reason = new Error('Promise failed')

    window.dispatchEvent(rejectionEvent)

    // 验证上报数据
    expect(transport.sendData.length).toBe(1)
    const report = transport.sendData[0]
    expect(report.type).toBe('unhandled_rejection')
    expect(report.message).toBe('Promise failed')
  })

  // 测试事件上下文信息生成
  test('should generate correct event context', () => {
    // 模拟一个点击事件
    const mockEvent = {
      type: 'click',
      target: document.createElement('button')
    } as unknown as Event

    ;(mockEvent.target as HTMLElement).id = 'test-btn'
    ;(getLastEvent as jest.Mock).mockReturnValue(mockEvent)
    ;(getRecentEvents as jest.Mock).mockReturnValue([{ type: 'input' }])

    window.dispatchEvent(new ErrorEvent('error', { message: 'Test' }))
    const context = transport.sendData[0].event_context
    expect(context.has_last_event).toBe(true)
    expect(context.last_event.type).toBe('click')
    expect(context.last_event.target).toBe('button#test-btn') // 验证选择器生成
    expect(context.last_event.paths).toBe('html > body > div') // 验证 getPaths 调用
    expect(context.recent_events).toEqual([{ type: 'input' }])
  })

  // 测试资源URL获取
  test('getResourceUrl should return correct resource url', () => {
    // 脚本元素
    const script = document.createElement('script')
    script.src = 'app.js'
    expect(errors['getResourceUrl'](script)).toBe('http://localhost/app.js')
    // 图片元素
    const img = document.createElement('img')
    img.src = 'image.jpg'
    expect(errors['getResourceUrl'](img)).toBe('http://localhost/image.jpg')
    // 样式元素
    const link = document.createElement('link')
    link.href = 'style.css'
    expect(errors['getResourceUrl'](link)).toBe('http://localhost/style.css')
    // 普通元素（无资源URL）
    const div = document.createElement('div')
    expect(errors['getResourceUrl'](div)).toBe('')
  })

  // 测试 destroy 方法是否正确移除事件监听
  test('destroy should remove all event listeners', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener')

    // 保存初始的监听器引用（关键：确保与 remove 时的引用一致）
    const globalErrorHandler = errors['globalErrorHandler']
    const rejectionHandler = errors['rejectionHandler']

    errors.destroy()

    // 验证 error 事件的移除
    expect(removeSpy).toHaveBeenCalledWith('error', globalErrorHandler)
    // 验证 unhandledrejection 事件的移除
    expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', rejectionHandler)

    // 验证引用已清空
    expect(errors['globalErrorHandler']).toBeNull()
    expect(errors['rejectionHandler']).toBeNull()

    removeSpy.mockRestore()
  })
})
