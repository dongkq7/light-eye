import { Transport, Integration } from '@light-eye/core'
import { getLastEvent, getRecentEvents, getPaths } from '@light-eye/browser-utils'
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
  private originalConsoleError?: typeof console.error

  constructor(private transport: Transport) {}

  init(): void {
    this.setupGlobalErrorHandler()
    this.setupUnhandledRejectionHandler()
    this.setupConsoleErrorHandler()
    this.setupResourceErrorHandler()
  }

  private setupGlobalErrorHandler(): void {
    window.addEventListener(
      'error',
      event => {
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
      },
      true
    )
  }

  private setupUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', event => {
      const lastEvent = getLastEvent()
      const recentEvents = getRecentEvents(3)

      this.transport.send({
        event_type: 'error',
        type: 'unhandled_rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        reason: this.serializeError(event.reason),
        path: window.location.pathname,
        timestamp: Date.now(),
        event_context: this.getEventContext(lastEvent, recentEvents)
      })
    })
  }

  private setupResourceErrorHandler(): void {
    window.addEventListener(
      'error',
      event => {
        const target = event.target as HTMLElement

        if (target && target !== window && target.nodeType === 1) {
          const lastEvent = getLastEvent()
          const recentEvents = getRecentEvents(3)

          const resourceInfo = {
            event_type: 'error',
            type: 'resource_load_error',
            tag_name: target.tagName,
            resource_url: this.getResourceUrl(target),
            path: window.location.pathname,
            timestamp: Date.now(),
            event_context: this.getEventContext(lastEvent, recentEvents)
          }

          this.transport.send(resourceInfo)
        }
      },
      true
    )
  }

  private setupConsoleErrorHandler(): void {
    this.originalConsoleError = console.error

    console.error = (...args: any[]) => {
      this.originalConsoleError?.apply(console, args)

      const lastEvent = getLastEvent()
      const recentEvents = getRecentEvents(3)

      this.transport.send({
        event_type: 'error',
        type: 'console_error',
        messages: args.map(arg => this.serializeError(arg)),
        stack: new Error().stack,
        path: window.location.pathname,
        timestamp: Date.now(),
        event_context: this.getEventContext(lastEvent, recentEvents)
      })
    }
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
        target: this.getElementSelector(lastEvent.target as Element),
        paths: getPaths(lastEvent),
        timestamp: Date.now() // 这里可以改进为实际事件时间
      }
    }

    return context
  }

  /**
   * 获取元素选择器
   */
  private getElementSelector(element: Element | null): string {
    if (!element) return ''

    let selector = element.tagName.toLowerCase()

    if (element.id) {
      selector += `#${element.id}`
    }

    if (element.className && typeof element.className === 'string') {
      const classNames = element.className
        .split(/\s+/)
        .filter(className => className.trim())
        .map(className => className.replace(/[^a-zA-Z0-9-_]/g, ''))

      if (classNames.length > 0) {
        selector += `.${classNames.join('.')}`
      }
    }

    return selector
  }

  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }
    return error
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
}
