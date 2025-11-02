import axios from 'axios'
import type { TokenConfig, TokenPair } from '../request/type'

interface RefreshQueueItem {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

export class TokenManager {
  private defaultTokenKey: string = 'access_token'
  private defaultRefreshTokenKey: string = 'refresh_token'
  private isRefreshing: boolean = false
  private refreshQueue: RefreshQueueItem[] = []

  // 获取token
  getToken(tokenConfig?: TokenConfig): string | null {
    if (tokenConfig?.getToken) {
      return tokenConfig.getToken()
    }
    const tokenKey = tokenConfig?.tokenKey || this.defaultTokenKey
    return localStorage.getItem(tokenKey)
  }

  // 设置token
  setToken(token: string, tokenConfig?: TokenConfig) {
    const tokenKey = tokenConfig?.tokenKey || this.defaultTokenKey
    localStorage.setItem(tokenKey, token)
  }

  // 设置refreshToken
  setRefreshToken(refreshToken: string, tokenConfig?: TokenConfig) {
    if (tokenConfig?.getRefreshToken) {
      return tokenConfig.getRefreshToken()
    }
    const refreshTokenKey = tokenConfig?.refreshTokenKey || this.defaultRefreshTokenKey
    localStorage.setItem(refreshTokenKey, refreshToken)
  }

  // 设置token对-accessToken与refreshToken
  setTokenPair(tokenPair: TokenPair, tokenConfig?: TokenConfig) {
    if (tokenConfig?.setTokenPair) {
      tokenConfig.setTokenPair(tokenPair)
      return
    }
    // 如果没有传入自定义设置方法，那么就默认进行分开存储
    const tokenKey = tokenConfig?.tokenKey || this.defaultTokenKey
    const refreshTokenKey = tokenConfig?.refreshTokenKey || this.defaultRefreshTokenKey
    localStorage.setItem(tokenKey, tokenPair.accessToken)
    if (tokenPair.refreshToken) {
      localStorage.setItem(refreshTokenKey, tokenPair.refreshToken)
    }
  }
  // 清除token
  clearToken(tokenConfig?: TokenConfig) {
    const tokenKey = tokenConfig?.tokenKey || this.defaultTokenKey
    const refreshTokenKey = tokenConfig?.refreshTokenKey || this.defaultRefreshTokenKey
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(refreshTokenKey)
  }

  // 刷新token - 支持并发请求排队
  async refreshToken(tokenConfig?: TokenConfig): Promise<string> {
    const refreshConfig = tokenConfig?.refreshConfig
    if (!refreshConfig?.getRequestUrl) {
      throw new Error(`getRequestUrl is required for token refresh`)
    }
    // 如果已经在刷新了，那么将请求加入队列
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject })
      })
    }

    this.isRefreshing = true

    try {
      // 动态获取请求刷新token的地址
      const refreshUrl = refreshConfig.getRequestUrl()
      if (!refreshUrl) {
        throw new Error('Refresh URL is not available')
      }
      // 获取当前的refreshToken
      const currentRefreshToken = refreshConfig.getCurrentRefreshToken()
      if (!currentRefreshToken) {
        throw new Error('No refresh token available')
      }

      // 构建请求参数
      const requestData = refreshConfig.requestMapper
        ? refreshConfig.requestMapper(currentRefreshToken)
        : this.buildDefaultRequestData(currentRefreshToken, refreshConfig.method)
      const response = await this.sendRefreshRequest(
        refreshUrl,
        refreshConfig.baseURL,
        requestData,
        refreshConfig.method
      )

      // 从响应中提取
      const tokenPair = refreshConfig.extractTokenFn(response.data)
      if (!tokenPair.accessToken) {
        throw new Error('Failed to extract access token from refresh response')
      }
      // 保存token对
      this.setTokenPair(tokenPair, tokenConfig)
      // 处理排队中的等待请求
      this.processRefreshQueue(tokenPair.accessToken, null)
      return tokenPair.accessToken
    } catch (error) {
      this.clearToken(tokenConfig)
      this.processRefreshQueue(null, error)
      throw error
    } finally {
      this.isRefreshing = false
    }
  }

  // 构建刷新token默认的请求数据
  private buildDefaultRequestData(refreshToken: string, method?: string) {
    if (method === 'POST') {
      return { data: { refreshToken } }
    } else {
      return { params: { refresh_token: refreshToken } }
    }
  }

  // 发送刷新请求
  private async sendRefreshRequest(url: string, baseURL: string, requestData: any, method?: string) {
    const config = {
      url,
      method: method || 'GET',
      baseURL,
      ...requestData
    }
    return axios(config)
  }

  // 处理刷新队列
  private processRefreshQueue(token: string | null, error: unknown) {
    while (this.refreshQueue.length > 0) {
      const item = this.refreshQueue.shift()!
      if (token) {
        item.resolve(token)
      } else {
        item.reject(error)
      }
    }
  }

  // 检查token是否有效
  isTokenValid(tokenConfig?: TokenConfig): boolean {
    const token = this.getToken(tokenConfig)
    return !!(token && token.length > 0)
  }
}

export const tokenManager = new TokenManager()
