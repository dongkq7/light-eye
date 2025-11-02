import { request } from '@/service'
/**
 * 用户相关
 */
export interface CreateUserPayload {
  username: string
  password: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginRes {
  access_token: string
}

export interface CurrentUserRes {
  username: string
  email: string
}

/**
 * 用户登录
 */
export const login = (data: LoginPayload) => {
  return request.post<LoginRes>('/auth/login', data)
}

/**
 * 获取当前用户信息
 */
export const currentUser = () => {
  return request.get<CurrentUserRes>('/auth/whoami')
}

/**
 * 用户注册
 */
export const register = (data: { username: string; password: string }) => {
  return request.post('/admin/register', data)
}
