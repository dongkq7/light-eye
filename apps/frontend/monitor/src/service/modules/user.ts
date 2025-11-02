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
export const login = async (data: LoginPayload) => {
  return await request.post<LoginRes>('/auth/login', data)
}

/**
 * 获取当前用户信息
 */
export const currentUser = async () => {
  return await request.get<CurrentUserRes>('/auth/whoami')
}

/**
 * 用户注册
 */
export const register = async (data: { username: string; password: string }) => {
  return await request.post('/admin/register', data)
}
