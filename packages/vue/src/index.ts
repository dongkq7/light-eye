import { getLastEvent, getRecentEvents } from '@light-eye/browser-utils'
import { init as initBrowserMonitor } from '@light-eye/browser'
import { Monitor, MonitorOptions, Transport } from '@light-eye/core'
import { App } from 'vue'

let initialized = false
function isError(value: unknown): value is Error {
  return value instanceof Error
}

// 从非 Error 类型中提取错误信息
function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') {
    return err // 处理直接抛出的字符串错误（如 throw 'xxx'）
  }
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message // 处理类 Error 对象（含 message 属性）
  }
  // 兜底：未知类型错误
  return 'Unknown error: ' + String(err)
}

function installVueMonitor(app: App, transport: Transport) {
  // 捕获vue的运行时异常
  app.config.errorHandler = (err, instance, info) => {
    const error = isError(err) ? err : new Error(getErrorMessage(err))
    const lastEvent = getLastEvent()
    const recentEvents = getRecentEvents(3)

    transport.send({
      event_type: 'error',
      type: 'vue_runtime_error',
      message: error.message,
      name: error.name,
      stack: error.stack,
      component: instance?.$options?.name || 'anonymous component',
      lifecycle_hook: info,
      path: window.location.pathname,
      timestamp: Date.now(),
      event_context: {
        has_last_event: !!lastEvent,
        last_event: lastEvent
          ? {
              type: lastEvent.type,
              target: lastEvent.target,
              timestamp: Date.now()
            }
          : undefined,
        recent_events: recentEvents
      }
    })
  }
}

const VueLightEye = {
  install(app: App, options: MonitorOptions) {
    return init(app, options)
  }
}

function init(app: App, options: MonitorOptions) {
  if (initialized) return
  const { monitor, transport } = initBrowserMonitor(options) ?? {}
  if (!monitor || !transport) {
    console.error('🔨 LightEye start error, please check config...')
    return {
      monitor: null
    }
  }
  installVueMonitor(app, transport)
  initialized = true
  return {
    monitor
  }
}

export default VueLightEye
