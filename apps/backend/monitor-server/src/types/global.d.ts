type LoginUser = {
  id: number
  username: string
}

declare module 'express' {
  interface Request {
    user: LoginUser
  }
}
