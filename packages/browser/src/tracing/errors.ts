import { Transport, Integration } from '@light-eye/core'
import { getLastEvent, getRecentEvents, getPaths, getElementSelector } from '@light-eye/browser-utils'
/**
 * // 错误上报数据示例
{
  "event_type": "error",
  "type": "js_runtime_error", 
  "message": "Cannot read property 'name' of null",
  "filename": "https://example.com/app.js",
  "lineno": 25,
  "colno": 15,
  "stack": "TypeError: Cannot read property...",
  "event_context": {
    "has_last_event": true,
    "last_event": {
      "type": "click",
      "target": "button#submit-btn",
      "paths": "html > body > div.container > button#submit-btn"
    },
    "recent_events": [
      {
        "type": "click", 
        "target": "button#submit-btn",
        "timestamp": 1630000000000
      },
      {
        "type": "keydown",
        "target": "input#username", 
        "timestamp": 1630000000500
      }
    ]
  }
}
 */
export class Errors implements Integration {
  public name = 'Errors'
  // 保存事件监听器引用，方便销毁时移除
  private globalErrorHandler: ((e: ErrorEvent) => void) | null = null
  private rejectionHandler: ((e: PromiseRejectionEvent) => void) | null = null
  constructor(private transport: Transport) {}

  init(): void {
    this.setupGlobalErrorHandler() // JS运行异常及资源异常
    this.setupUnhandledRejectionHandler() // Promise异常
  }

  private setupGlobalErrorHandler(): void {
    this.globalErrorHandler = (event: ErrorEvent) => {
      const target = event.target as HTMLElement | Window | null
      if (target && target !== window && (target as HTMLElement).nodeType === Node.ELEMENT_NODE) {
        this.handleResourceError(event, target as HTMLElement)
        return
      }
      this.handleJsRuntimeError(event)
    }
    window.addEventListener('error', this.globalErrorHandler, true)
  }

  private handleJsRuntimeError(event: ErrorEvent) {
    // 获取最后一个用户操作事件和最近事件序列
    const lastEvent = getLastEvent()
    const recentEvents = getRecentEvents(3)

    const errorInfo = {
      event_type: 'error',
      type: 'js_runtime_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error_type: event.error?.name,
      stack: event.error?.stack,
      path: window.location.pathname,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      framework: 'native',
      // 事件上下文信息
      event_context: this.getEventContext(lastEvent, recentEvents)
    }

    this.transport.send(errorInfo)
  }

  private handleResourceError(event: ErrorEvent, target: HTMLElement) {
    const lastEvent = getLastEvent()
    const recentEvents = getRecentEvents(3)

    this.transport.send({
      event_type: 'error',
      type: 'resource_load_error',
      message: `获取${target.tagName}资源失败`,
      tag_name: target.tagName,
      resource_url: this.getResourceUrl(target),
      path: window.location.pathname,
      timestamp: Date.now(),
      event_context: this.getEventContext(lastEvent, recentEvents)
    })
  }

  private setupUnhandledRejectionHandler(): void {
    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      const lastEvent = getLastEvent()
      const recentEvents = getRecentEvents(3)

      this.transport.send({
        event_type: 'error',
        type: 'unhandled_rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        path: window.location.pathname,
        timestamp: Date.now(),
        event_context: this.getEventContext(lastEvent, recentEvents)
      })
    }
    window.addEventListener('unhandledrejection', this.rejectionHandler)
  }
  /**
   * 获取事件上下文信息
   */
  private getEventContext(lastEvent: Event | null, recentEvents: any[]): any {
    const context: any = {
      has_last_event: !!lastEvent,
      recent_events: recentEvents
    }

    if (lastEvent) {
      context.last_event = {
        type: lastEvent.type,
        target: getElementSelector(lastEvent.target as HTMLElement),
        paths: getPaths(lastEvent),
        timestamp: Date.now() // 这里可以改进为实际事件时间
      }
    }

    return context
  }

  private getResourceUrl(element: HTMLElement): string {
    if (element instanceof HTMLImageElement) return element.src
    if (element instanceof HTMLScriptElement) return element.src
    if (element instanceof HTMLLinkElement) return element.href
    if (element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) {
      return element.src
    }
    return ''
  }

  destroy() {
    if (this.globalErrorHandler) {
      window.removeEventListener('error', this.globalErrorHandler)
      this.globalErrorHandler = null
    }
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler)
      this.rejectionHandler = null
    }
  }
}
