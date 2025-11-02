import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { AdminService } from '../admin/admin.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly adminService: AdminService) {
    super({
      // 表示从header中Authorization属性中获取Bearer的token值
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 表示不忽视token过期的情况，过期会返回401
      ignoreExpiration: false,
      secretOrKey: 'HelloWorld'
    })
  }

  async validate(payload: { id: number; username: string }) {
    const { id } = payload

    const user = await this.adminService.findUserById(id)
    return user
  }
}
