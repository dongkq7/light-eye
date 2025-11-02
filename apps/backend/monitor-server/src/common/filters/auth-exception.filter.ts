import { ArgumentsHost, ExceptionFilter, UnauthorizedException } from '@nestjs/common'

export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const message = exception.message || '认证失败'
    // 未授权状态码固定为 401
    const statusCode = exception.getStatus()

    // 按拦截器的格式返回响应
    response.status(statusCode).json({
      code: statusCode, // 状态码与拦截器保持一致
      message: message, // 替换为具体错误信息
      data: null // 认证失败时无数据
    })
  }
}
