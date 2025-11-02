import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'

@Controller('auth')
export class AuthController {
  @Inject(JwtService)
  private jwtService: JwtService

  constructor(private readonly authService: AuthService) {}
  @Post('/login')
  @UseGuards(AuthGuard('local'))
  async login(@Req() req: Request) {
    const token = this.jwtService.sign({
      id: req.user.id,
      username: req.user.username
    })
    return {
      token
    }
  }

  @Get('/whoami')
  // 必须要登录之后，具备用户身份才能访问，我们需要用守卫来做鉴权，并且鉴权策略是 jwt
  @UseGuards(AuthGuard('jwt'))
  async whoami(@Req() req: Request) {
    return req.user
  }

  @Get('/validate')
  async validate(@Body() body) {
    return this.authService.validateUser(body.username, body.password)
  }
}
