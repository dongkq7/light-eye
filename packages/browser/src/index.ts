import { Monitor, MonitorOptions } from '@light-eye/core'
import { BrowserTransport } from './transport'
import { Errors } from './tracing/errors'
import { EventTracker, initEventTracker } from '@light-eye/browser-utils'
import { Metrics } from './tracing/metrics'

export const init = (options: MonitorOptions) => {
  if (!options.dsn) {
    console.warn('⚠️ Please config dsn')
    return
  }
  // 从options中获取事件追踪配置
  const eventTrackerConfig = options.eventTracker || {}

  // 初始化事件追踪器
  const eventTracker = initEventTracker(eventTrackerConfig)

  const monitor = new Monitor(options)

  const transport = new BrowserTransport({
    dsn: options.dsn,
    useBatch: options.transportOptions?.useBatch || true,
    bufferSize: options.transportOptions?.bufferSize || 10,
    lazyTimeout: options.transportOptions?.lazyTimeout || 3000
  })

  monitor.init(transport)

  // 错误采集
  new Errors(transport).init()

  // 性能采集
  new Metrics(transport).init()

  return {
    monitor,
    eventTracker,
    transport
  }
}

export { Monitor, BrowserTransport, Errors }
