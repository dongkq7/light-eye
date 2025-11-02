/**
 * 应用相关
 */
export type ApplicationType = 'vanilla' | 'react' | 'vue'

export interface ApplicationData {
  type: ApplicationType
  appId: string
  name: string
  bugs: number
  transactions: number
  data: {
    date: string
    resting: number
  }[]
  createdAt: Date
}
/**
 * 应用列表
 */
export interface ApplicationListRes {
  data: { applications: ApplicationData[] }
}

/**
 * 创建应用
 */
export interface CreateApplicationPayload {
  name: string
  type: ApplicationType
}
