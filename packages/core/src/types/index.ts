import { Transport } from '../transport'
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

export interface IIntegration {
  init(transport: Transport): void
}

export class Integration implements IIntegration {
  transport: Transport | null = null
  init(transport: Transport): void {
    this.transport = transport
  }
}
export interface MonitorOptions {
  dsn: string // 数据源地址
  integrations?: IIntegration[] // 集成的插件
}
