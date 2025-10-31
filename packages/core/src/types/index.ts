export interface MonitorOptions {
  dsn: string // 数据源地址
  integrations?: Integration[] // 集成的插件
  transportOptions?: TransportOptions // transport配置
  eventTracker?: EventTrackerConfig // 事件追踪配置
}

export interface TransportOptions {
  dsn: string
  bufferSize?: number // 批量发送阈值
  lazyTimeout?: number // 批量发送延迟事件
  useBatch?: boolean // 是否批量发送
}

export interface EventTrackerConfig {
  enabled?: boolean // 是否启用事件追踪
  timeout?: number // 事件有效期（毫秒）
  maxEvents?: number // 最大事件记录数
  captureEvents?: string[] // 要捕获的事件类型
}

export interface Transport {
  send(data: any): void
  destroy(): void
}

export type ErrorType =
  | 'runtime_error'
  | 'promise_rejection'
  | 'resource_error'
  | 'http_error'
  | 'react_error'
  | 'custom_error'

export interface ErrorData {
  type: ErrorType
  message?: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
  [key: string]: any
}

export interface Integration {
  name: string
  init(transport: Transport): void
}
