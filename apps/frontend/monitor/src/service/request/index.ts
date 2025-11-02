import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { type AxiosInstance } from 'axios'
import type { BaseResponse, MRquestConfig, TokenConfig } from './type'
import { SUCCESS_CODES } from '../config'
import { tokenManager } from '../utils/tokenManager'
import { handleError, RequestError } from '../utils/errorHandler'

class MRequest {
  service: AxiosInstance
  tokenConfig: TokenConfig
  private tokenInvalidHandlers: Array<() => void> = []
  // 每个request实例 => axios的实例
  constructor(config: MRquestConfig) {
    this.service = axios.create(config)
    this.tokenConfig = config.token || {}

    this.setupInterceptors(config)
  }

  // 配置拦截器
  /** 集中配置拦截器 */
  private setupInterceptors(config: MRquestConfig) {
    // 2.1 请求拦截器
    this.service.interceptors.request.use(
      reqConfig => this.handleRequestSuccess(reqConfig),
      err => this.handleRequestError(err)
    )

    // 2.2 响应拦截器
    this.service.interceptors.response.use(
      res => this.handleResponseSuccess(res),
      err => this.handleResponseError(err)
    )

    // 2.3 实例级拦截器（优先级高于默认）
    if (config.interceptors) {
      this.service.interceptors.request.use(config.interceptors.requestSuccessFn, config.interceptors.requestFailureFn)
      this.service.interceptors.response.use(config.interceptors.responseSuccessFn, err => {
        // 实例级错误拦截器可先处理，再返回统一错误
        const processedErr = config.interceptors?.responseFailureFn?.(err)
        return Promise.reject(processedErr instanceof RequestError ? processedErr : handleError(err))
      })
    }
  }

  /** 请求成功拦截：添加Token与请求ID */
  private handleRequestSuccess(config: InternalAxiosRequestConfig) {
    const token = tokenManager.getToken(this.tokenConfig)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 添加请求ID（便于追踪）
    config.headers['X-Request-Id'] = crypto.randomUUID()
    return config
  }

  /** 请求错误拦截：转换为统一的RequestError */
  private handleRequestError(err: AxiosError): Promise<never> {
    return Promise.reject(handleError(err))
  }

  /** 响应成功拦截：校验业务状态码 */
  private handleResponseSuccess(res: AxiosResponse<BaseResponse>) {
    const { data } = res
    if (data?.code !== undefined && !SUCCESS_CODES.includes(data.code)) {
      // 业务失败：构造RequestError
      const businessError = new RequestError(
        'BUSINESS',
        data.code || -100,
        data.message || '业务处理失败',
        undefined,
        res.headers['x-request-id'] as string
      )
      return Promise.reject(businessError)
    }
    return data
  }

  /** 响应错误拦截：转换为统一RequestError + Token失效处理 */
  private async handleResponseError(err: AxiosError): Promise<never> {
    // 先转换为统一错误格式
    const unifiedError = handleError(err) as RequestError

    // 处理token失效
    if (unifiedError.type === 'AUTH' && this.tokenConfig.shouldRefresh) {
      const originalRequest = err.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }

      // 防止无限重试
      if (originalRequest._retry) {
        this.emitTokenInvalid()
        return Promise.reject(unifiedError)
      }

      try {
        // 标记为已重试
        originalRequest._retry = true
        // 刷新token
        const newToken = await tokenManager.refreshToken(this.tokenConfig)

        // 重试原请求
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return this.service(originalRequest)
      } catch {
        // 刷新失败，触发全局Token失效
        this.emitTokenInvalid()
      }
    }

    // 非Auth错误或处理失败，返回统一错误
    return Promise.reject(unifiedError)
  }

  // 手动刷新 token（供外部调用）
  async refreshToken(): Promise<string> {
    return tokenManager.refreshToken(this.tokenConfig)
  }

  // 手动清除 token（供外部调用）
  clearToken(): void {
    tokenManager.clearToken(this.tokenConfig)
  }

  // 检查 token 是否有效（供外部调用）
  isTokenValid(): boolean {
    return tokenManager.isTokenValid(this.tokenConfig)
  }

  // 注册token失效监听
  onTokenInvalid(handler: () => void) {
    this.tokenInvalidHandlers.push(handler)
    return () => {
      const index = this.tokenInvalidHandlers.indexOf(handler)
      if (index > -1) {
        this.tokenInvalidHandlers.splice(index, 1)
      }
    }
  }

  // token失效事件触发
  private emitTokenInvalid() {
    tokenManager.clearToken(this.tokenConfig)
    this.tokenInvalidHandlers.forEach(handler => handler())
  }

  // 封装网络请求的方法
  request<T = BaseResponse>(config: MRquestConfig<T>) {
    if (config.interceptors?.requestSuccessFn) {
      config = config.interceptors.requestSuccessFn(config as InternalAxiosRequestConfig)
    }
    return new Promise<T>((resolve, reject) => {
      this.service
        .request<unknown, T>(config)
        .then(res => {
          if (config.interceptors?.responseSuccessFn) {
            res = config.interceptors.responseSuccessFn(res)
          }
          resolve(res)
        })
        .catch(err => {
          if (config.interceptors?.responseFailureFn) {
            config.interceptors.responseFailureFn(err)
          }
          reject(err)
        })
    })
  }
  get<T = null>(url: string, params?: unknown, config?: MRquestConfig<BaseResponse<T>>) {
    return this.request<BaseResponse<T>>({
      ...config,
      method: 'GET',
      url,
      params
    })
  }
  post<T = null>(url: string, data?: unknown, config?: MRquestConfig<BaseResponse<T>>) {
    return this.request<BaseResponse<T>>({
      ...config,
      method: 'POST',
      url,
      data
    })
  }
  delete<T = null>(url: string, data?: unknown, config?: MRquestConfig<BaseResponse<T>>) {
    return this.request<BaseResponse<T>>({
      ...config,
      method: 'DELETE',
      url,
      data
    })
  }
  put<T = null>(url: string, data?: unknown, config?: MRquestConfig<BaseResponse<T>>) {
    return this.request<BaseResponse<T>>({
      ...config,
      method: 'PUT',
      url,
      data
    })
  }
}

export default MRequest
