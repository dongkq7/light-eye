// import { message } from 'antd'
import { toast } from 'sonner'
import { RequestConfig } from './config'
import MRequest from './request'

const dsnRequest = new MRequest({
  baseURL: RequestConfig.DSN_URL,
  timeout: RequestConfig.TIMEOUT
})

const request = new MRequest({
  baseURL: RequestConfig.BASE_URL,
  timeout: RequestConfig.TIMEOUT,
  token: {
    tokenKey: RequestConfig.TOKEN_KEY
  }
})

// token失效注册
request.onTokenInvalid(() => {
  toast.error('登录已过期，请重新登录')
  setTimeout(() => {
    window.location.href = '/login'
  }, 1500)
})

export { dsnRequest, request }
