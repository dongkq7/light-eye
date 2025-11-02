import { dsnRequest } from '@/service'
export interface Issue {
  id: number
  title: string
  description: string
  appId: string
  events: number
  users: number
  status: 'active' | 'draft'
  createAt: Date
}

export interface IssueRes {
  info: {
    type: string
    stack: string
    path: string
  }
  message: string
  created_at: Date
  app_id: string
}

export const bugs = () => {
  return dsnRequest.get<IssueRes[]>('/storage/bugs')
}

export const allData = () => {
  return dsnRequest.get<IssueRes[]>('/storage/data')
}
