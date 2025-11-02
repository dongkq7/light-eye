import { isCancel, type AxiosError } from 'axios'

type ErrorType = 'NETWORK' | 'BUSINESS' | 'AUTH' | 'TIMEOUT' | 'CANCEL'
export class RequestError extends Error {
  // 错误类型：网络错误/业务错误/认证错误/超时/取消
  public type: ErrorType
  // 错误码（HTTP状态码或自定义错误码）
  public code: number
  // 原始错误对象（保留调试信息）
  public originalError?: AxiosError | Error
  // 可选：请求ID，用于追踪问题
  public requestId?: string

  constructor(type: ErrorType, code: number, message: string, originalError?: AxiosError | Error, requestId?: string) {
    super(message)
    this.name = 'RequestError' // 固定错误名称，便于instanceof判断
    this.type = type
    this.code = code
    this.originalError = originalError
    this.requestId = requestId
  }
}

/**
 * 处理axios错误，转换为统一的RequestError
 * @param error axios抛出的错误（可能是AxiosError、取消错误等）
 * @returns 标准化的RequestError实例
 */
export const handleError = (error: unknown): RequestError => {
  // 处理取消请求错误
  if (isCancel(error)) {
    return new RequestError('CANCEL', -1, '请求已取消', error as Error)
  }

  // 类型断言：确保error是AxiosError（非取消错误时）
  const axiosError = error as AxiosError

  // 处理网络断开
  if (!window.navigator?.onLine) {
    return new RequestError('NETWORK', -2, '网络连接已断开', axiosError)
  }

  // 处理超时错误
  if (axiosError.code === 'ECONNABORTED' || /timeout/i.test(axiosError.message)) {
    return new RequestError('TIMEOUT', -3, '请求超时，请重试', axiosError)
  }

  // 处理响应错误（服务器返回了状态码）
  if (axiosError.response) {
    const { status, data, headers } = axiosError.response
    // 从相应头上获取请求ID，便于后端追踪
    const requestId = headers['x-request-id'] as string
    // 优先使用后端返回的错误信息，否则用默认文案
    const message = data?.message || data?.data || `请求失败 ${status}`

    // 认证错误
    if (status === 401) {
      return new RequestError('AUTH', status, message || '未授权，请重新登录', axiosError, requestId)
    }

    // 服务器错误
    if (status >= 500) {
      return new RequestError('NETWORK', status, message || '服务器内部错误', axiosError, requestId)
    }

    // 客户端业务错误（4xx非401）
    return new RequestError('BUSINESS', status, message, axiosError, requestId)
  }
  // 其他类型错误（比如DNS解析失败，跨域等）
  return new RequestError('NETWORK', -4, axiosError.message || '网络请求失败，请检查网络')
}
