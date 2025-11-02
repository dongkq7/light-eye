import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// 对AxiosRequestConfig进行扩展，让AxiosRequestConfig支持配置拦截器
export interface MInterceptor<T = AxiosResponse> {
  requestSuccessFn?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
  requestFailureFn?: (err: unknown) => unknown
  responseSuccessFn?: (res: T) => T
  responseFailureFn?: (err: unknown) => unknown
}
export interface TokenPair {
  accessToken: string
  refreshToken?: string
}
export interface TokenConfig {
  tokenKey?: string // token在localStorage中的key
  refreshTokenKey?: string // refreshToken在localStorage中的key
  shouldRefresh?: boolean // 是否需要自动刷新token
  getToken?: () => string | null // 获取token的自定义方法，优先级高于tokenKey(从localStorage中获取)
  getRefreshToken?: () => string | null // 获取refresh token的自定义方法
  setTokenPair?: (tokenPair: TokenPair) => void // 设置token的方法
  refreshConfig?: RefreshTokenConfig // 刷新token的相关配置
}
// 刷新token相关配置
export interface RefreshTokenConfig {
  baseURL: string
  getRequestUrl: () => string // 获取请求地址的方法，动态返回
  method?: 'GET' | 'POST'
  getCurrentRefreshToken: () => string | null // 获取当前的refreshToken
  extractTokenFn: (res: any) => TokenPair
  requestMapper?: (refreshToken: string) => unknown // 动态请求参数映射
  beforeRequest?: (config: any) => any // 请求前的狗仔函数，可以在这里动态修改请求配置
}
export interface MRquestConfig<T = AxiosResponse> extends AxiosRequestConfig {
  interceptors?: MInterceptor<T>
  token?: TokenConfig // token相关配置
}

export interface BaseResponse<T = unknown> {
  code: number
  message: string
  data: T
}
