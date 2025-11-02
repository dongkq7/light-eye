import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common'
import { AdminService } from '../admin/admin.service'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(private readonly adminService: AdminService) {}

  async validateUser(username: string, pwd: string) {
    const admin = await this.adminService.validateUser(username, pwd)
    if (!admin) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    // 从 admin 对象中移除密码字段
    const { password, ...result } = admin
    return result
  }

  async login(user: LoginDto) {
    const foundUser = await this.adminService.validateUser(user.username, user.password)
    if (!foundUser) {
      throw new HttpException('用户名或密码错误', 200)
    }

    return foundUser
  }
}
