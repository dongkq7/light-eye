import { cachePool } from '@light-eye/utils'
import { BrowserTransport } from '../transport'

// 模拟基础配置
const MOCK_DSN = 'http://test-server.com/report'
const DEFAULT_OPTIONS = {
  dsn: MOCK_DSN,
  bufferSize: 2, // 小一点方便测试批量发送
  bufferDelay: 100,
  maxRetries: 1 // 重试次数设为1，减少测试耗时
}

beforeEach(() => {
  cachePool.clearCache()
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('BrowserTransport', () => {
  let transport: BrowserTransport

  beforeEach(() => {
    transport = new BrowserTransport(DEFAULT_OPTIONS)
  })

  afterEach(() => {
    transport.destroy()
  })

  // 测试初始化
  test('should initialize with default options', () => {
    expect(transport['options']).toEqual({
      ...DEFAULT_OPTIONS,
      bufferSize: 2,
      bufferDelay: 100,
      maxRetries: 1,
      useBatch: true
    })
  })

  // 测试单条数据发送
  test('send() should add data to cache pool', () => {
    const testData = { event_type: 'click', value: 1 }
    transport.send(testData)

    expect(cachePool.getSize('click')).toBe(1)
    expect(cachePool.getCache().get('click')).toContain(testData)
  })

  // 测试批量发送数据 - 达到阈值 bufferSize 时触发
  test('should trigger sendBatch when cache reaches bufferSize', async () => {
    // 模拟成功触发的fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response)
    const sendBatchSpy = jest.spyOn(transport as any, 'sendBatch')

    // 发送2条数据（达到 bufferSize=2）
    transport.send({ event_type: 'click', value: 1 })
    transport.send({ event_type: 'click', value: 2 })

    // 等待发送完成
    await Promise.resolve()

    expect(sendBatchSpy).toHaveBeenCalledTimes(1)
    expect(sendBatchSpy).toHaveBeenCalledWith(
      expect.any(Array), // 数据数组
      'click' // 事件类型
    )
    // 发送后缓存应清空
    expect(cachePool.getSize('click')).toBe(0)
  })

  // 测试正在发送
  test('is sending', () => {
    const sendBatchSpy = jest.spyOn(transport as any, 'sendBatch')
    transport['isSending'] = true
    transport.send({ event_type: 'click', value: 1 })
    expect(sendBatchSpy).toHaveBeenCalledTimes(0)
  })

  // 测试延迟发送（未达到阈值时触发了定时器）
  test('should retry on send failure and save to localStorage after max retries', async () => {
    // 模拟 fetch 持续失败
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem')

    // 直接测试重试逻辑，不经过完整的发送流程
    const testData = [{ event_type: 'error', value: 1 }]
    const type = 'error'

    // 模拟发送失败，直接添加到重试队列
    transport['retryQueue'].push({
      data: testData,
      type: type,
      retries: 1 // 直接设置为最大重试次数
    })

    // 触发重试逻辑（应该会保存到 localStorage）
    await transport['scheduleRetry']()

    // 验证保存到 localStorage
    expect(localStorageSpy).toHaveBeenCalledWith(
      'light_eye_failed_reports',
      expect.stringContaining('"event_type":"error"')
    )
    expect(transport['retryQueue'].length).toBe(0)
  }, 10000)

  // 测试页面隐藏时触发 flush
  test('should flush when page visibility changes to hidden', () => {
    const flushSpy = jest.spyOn(transport, 'flush')

    // 触发 visibilitychange 事件（状态为 hidden）
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(flushSpy).toHaveBeenCalledTimes(1)
  })

  // 测试页面卸载时使用 sendBeacon 发送
  test('should use sendBeacon on beforeunload', () => {
    if (!navigator.sendBeacon) {
      navigator.sendBeacon = jest.fn().mockReturnValue(true)
    }
    // 模拟 sendBeacon
    const sendBeaconSpy = jest.spyOn(navigator, 'sendBeacon').mockReturnValue(true)

    // 添加数据到缓存
    transport.send({ event_type: 'unload', value: 1 })

    // 触发 beforeunload 事件
    window.dispatchEvent(new Event('beforeunload'))

    expect(sendBeaconSpy).toHaveBeenCalledWith(
      MOCK_DSN,
      expect.any(Blob) // 检查是否发送 Blob
    )
    // 发送后缓存应清空
    expect(cachePool.getSize('unload')).toBe(0)
  })

  // 测试 destroy 方法（清理定时器和事件）
  test('destroy() should clear timers and event listeners', () => {
    // 模拟定时器和事件监听
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout')
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    const documentEventListenerSpy = jest.spyOn(document, 'removeEventListener')

    // 设置一个定时器
    transport.send({ event_type: 'test', value: 1 })
    jest.runAllTimers()

    // 调用 destroy
    transport.destroy()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    expect(documentEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(transport['retryQueue']).toEqual([]) // 重试队列清空
  })

  // 测试重试逻辑
  test('should add failed batch to retry queue and increment retries', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    // 发送数据并触发批量发送
    transport.send({ event_type: 'error', value: 1 })
    transport.send({ event_type: 'error', value: 2 }) // 达到 bufferSize=2，触发 sendBatch

    await Promise.resolve() // 等待异步操作完成

    // 验证失败后进入重试队列
    expect(transport['retryQueue'].length).toBe(1)
    expect(transport['retryQueue'][0]!.type).toBe('error')
    expect(transport['retryQueue'][0]!.data.length).toBe(2)
    expect(transport['retryQueue'][0]!.retries).toBe(0)

    // 触发重试并验证次数累计
    jest.advanceTimersByTime(1000) // 快进首次重试延迟（1s * 2^0）
    await Promise.resolve()

    // 重试后失败，重试次数应+1
    expect(transport['retryQueue'][0]!.retries).toBe(1)
  })

  // 测试指数退避重试的时间间隔
  test('should use exponential backoff for retry delay', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout')
    transport['options'].maxRetries = 2

    // 添加重试项（初始 retries=0）
    transport['retryQueue'].push({ data: [{ value: 1 }], type: 'test', retries: 0 })

    // 启动重试调度
    const schedulePromise = transport['scheduleRetry']()

    // 此时定时器已被创建，可验证延迟时间
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000) // 1s * 2^0

    // 快进定时器，触发回调执行
    jest.advanceTimersByTime(1000)

    // 等待整个调度流程完成（包括Promise resolve和后续逻辑）
    await schedulePromise

    // 此时重试次数已变为1，下一次延迟应为 2000ms
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000) // 1s * 2^1
  })

  // 测试flush方法触发后会将retry队列中的数据进行上报
  test('flush() should trigger retry queue processing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response)
    const scheduleRetrySpy = jest.spyOn(transport as any, 'scheduleRetry')

    // 手动添加重试项
    transport['retryQueue'].push({ data: [{ value: 1 }], type: 'test', retries: 0 })

    // 调用 flush()
    await transport.flush()

    // 验证重试被触发
    expect(scheduleRetrySpy).toHaveBeenCalledTimes(1)
  })

  // 测试同类型数据的批量重试
  test('should merge same-type failed data in retry queue', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    // 第一次发送失败
    transport.send({ event_type: 'log', value: 1 })
    transport.send({ event_type: 'log', value: 2 }) // 触发批量发送
    await Promise.resolve()

    // 第二次发送失败（新数据）
    transport.send({ event_type: 'log', value: 3 })
    transport.send({ event_type: 'log', value: 4 }) // 触发批量发送
    await Promise.resolve()

    // 验证重试队列中同类型数据被合并
    expect(transport['retryQueue'].length).toBe(1)
    expect(transport['retryQueue'][0]!.data.length).toBe(4) // 2 + 2
  })
})
