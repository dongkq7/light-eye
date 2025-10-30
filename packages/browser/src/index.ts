import { Monitor, MonitorOptions } from '@light-eye/core'
import { BrowserTransport } from './transport'
import { Errors } from './tracing/errors'
import { initEventTracker } from '@light-eye/browser-utils'

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
    useBatch: options.transportOptions?.useBatch,
    bufferSize: options.transportOptions?.bufferSize,
    bufferDelay: options.transportOptions?.bufferDelay
  })

  monitor.init(transport)

  // 错误采集
  new Errors(transport).init()

  // 性能采集
  // TODO
  // new Metrics(transport).init()

  return {
    monitor,
    eventTracker
  }
}

export { Monitor, BrowserTransport, Errors }
