export const RequestConfig = {
  DSN_URL: '/dsn-api',
  BASE_URL: '/api',
  TIMEOUT: 10000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
  CACHE_EXPIRE_TIME: 5 * 60 * 1000, // 5分钟
  TOKEN_KEY: 'access_token'
  // REFRESH_TOKEN_KEY: 'refresh_token'
} as const

export const ResponseCode = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const

// 成功的 code 白名单
export const SUCCESS_CODES = [ResponseCode.SUCCESS, ResponseCode.CREATED] as number[]
