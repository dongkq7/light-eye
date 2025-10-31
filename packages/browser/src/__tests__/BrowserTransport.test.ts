import { BrowserTransport } from '../transport'
import { cachePool } from '@light-eye/utils'

describe('BrowserTransport', () => {
  let transport: BrowserTransport
  const mockDsn = 'https://example.com/report'

  beforeEach(() => {
    jest.clearAllMocks()
    cachePool.clearCache()
    transport = new BrowserTransport({ dsn: mockDsn })
  })

  afterEach(() => {
    transport.destroy()
  })

  describe('constructor & setup', () => {
    test('should initialize with default options', () => {
      expect(transport['options']).toEqual(
        expect.objectContaining({
          dsn: mockDsn,
          useBatch: true,
          lazyTimeout: 3000,
          bufferSize: 10
        })
      )
    })

    test('should bind beforeunload event', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      new BrowserTransport({ dsn: mockDsn })
      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })
  })

  describe('send method', () => {
    test('should send batch data when useBatch is true', () => {
      const sendBatchSpy = jest.spyOn(transport, 'sendBatch' as never)
      transport.send({ event_type: 'test', data: 1 })
      expect(sendBatchSpy).toHaveBeenCalled()
    })

    test('should send real-time data when useBatch is false', () => {
      const realTransport = new BrowserTransport({ dsn: mockDsn, useBatch: false })
      const sendRealTimeSpy = jest.spyOn(realTransport, 'sendRealTime' as never)
      realTransport.send({ event_type: 'test', data: 1 })
      expect(sendRealTimeSpy).toHaveBeenCalled()
    })
  })

  describe('batch sending', () => {
    test('should add data to cache pool', () => {
      transport.send({ event_type: 'test', data: 1 })
      expect(cachePool.getSize('test')).toBe(1)
    })

    test('should flush when bufferSize is reached', () => {
      const flushSpy = jest.spyOn(transport, 'flushCacheType' as never)
      // 发送10条数据触发bufferSize
      for (let i = 0; i < 10; i++) {
        transport.send({ event_type: 'test', data: i })
      }
      expect(flushSpy).toHaveBeenCalledWith('test')
    })

    test('should schedule lazy flush when bufferSize not reached', () => {
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout')
      transport.send({ event_type: 'test', data: 1 })
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000)
    })
  })

  describe('flush logic', () => {
    if (!navigator.sendBeacon) {
      navigator.sendBeacon = jest.fn().mockReturnValue(true)
    }
    test('flushCacheType should send and clear specific type', () => {
      const sendBeaconSpy = jest.spyOn(navigator, 'sendBeacon').mockReturnValue(true)
      cachePool.addBatchCache('test', [{ data: 1 }, { data: 2 }])
      transport['flushCacheType']('test')
      expect(sendBeaconSpy).toHaveBeenCalledWith(mockDsn, expect.any(Blob))
      expect(cachePool.getSize('test')).toBe(0)
      sendBeaconSpy.mockRestore()
    })

    test('flushAllCache should send all types and clear cache', () => {
      const sendBeaconSpy = jest.spyOn(navigator, 'sendBeacon').mockReturnValue(true)
      cachePool.addBatchCache('a', [{ data: 1 }])
      cachePool.addBatchCache('b', [{ data: 2 }])
      transport['flushAllCache']()
      expect(sendBeaconSpy).toHaveBeenCalledTimes(2)
      expect(cachePool.getSize()).toBe(0)
      sendBeaconSpy.mockRestore()
    })

    test('flushWithBeacon should send all data on beforeunload', () => {
      const sendBeaconSpy = jest.spyOn(navigator, 'sendBeacon').mockReturnValue(true)
      cachePool.addBatchCache('test', [{ data: 1 }])
      window.dispatchEvent(new Event('beforeunload'))
      expect(sendBeaconSpy).toHaveBeenCalledWith(mockDsn, expect.any(Blob))
      sendBeaconSpy.mockRestore()
    })
  })

  describe('sending compatibility', () => {
    test('should fallback to XHR when sendBeacon is not available', async () => {
      jest.useFakeTimers()
      // 保存原始 sendBeacon 并模拟其不存在
      const originalSendBeacon = navigator.sendBeacon
      navigator.sendBeacon = undefined as any

      // 模拟 XMLHttpRequest 并跟踪其实例方法
      const mockXhr = {
        open: jest.fn(),
        setRequestHeader: jest.fn(),
        send: jest.fn()
      }
      const xhrSpy = jest.spyOn(window, 'XMLHttpRequest').mockImplementation(() => mockXhr as any)

      // 发送数据（触发批量缓存和 lazyTimer）
      transport.send({ event_type: 'test', data: 1 })

      // 确保定时器已创建，再快进时间触发回调
      expect(transport['lazyTimer']).not.toBeNull() // 验证定时器已设置
      jest.advanceTimersByTime(3000) // 触发 lazy flush

      // 手动执行微任务队列（确保异步逻辑完成）
      await Promise.resolve()

      // 验证 XHR 被调用
      expect(xhrSpy).toHaveBeenCalled()
      expect(mockXhr.open).toHaveBeenCalledWith('POST', mockDsn, true)
      expect(mockXhr.send).toHaveBeenCalled()

      // 恢复原始 API，避免影响其他测试
      navigator.sendBeacon = originalSendBeacon
      jest.useRealTimers()
      xhrSpy.mockRestore()
    })
  })

  describe('destroy method', () => {
    test('should clear timers and event listeners', () => {
      transport.send({ event_type: 'test', data: 1 })
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      transport.destroy()
      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
      expect(cachePool.getSize()).toBe(0)
    })
  })

  describe('formatPayload', () => {
    test('should format data with browser info', () => {
      const data = transport['formatPayload']([{ id: 1 }], 'test')
      expect(data).toEqual(
        expect.objectContaining({
          event_type: 'test',
          browserInfo: expect.objectContaining({
            userAgent: navigator.userAgent,
            language: navigator.language,
            referrer: document.referrer,
            path: location.pathname
          })
        })
      )
    })
  })
})
