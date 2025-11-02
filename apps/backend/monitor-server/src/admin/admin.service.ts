import { Repository } from 'typeorm/repository/Repository'
import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Admin } from './entities/admin.entity'
import { RegisterDto } from './dto/register.dto'
import * as crypto from 'crypto'

function md5(str: string) {
  const hash = crypto.createHash('md5')
  hash.update(str)
  return hash.digest('hex')
}

@Injectable()
export class AdminService {
  constructor(@InjectRepository(Admin) private readonly adminRepository: Repository<Admin>) {}

  async validateUser(username: string, password: string) {
    const admin = await this.adminRepository.findOne({
      where: { username, password: md5(password) }
    })
    return admin
  }

  async register(admin: RegisterDto) {
    const foundUser = await this.adminRepository.findOneBy({
      username: admin.username
    })
    if (foundUser) {
      throw new HttpException('该用户已存在', 200)
    }

    const newUser = new Admin()
    newUser.username = admin.username
    newUser.password = md5(admin.password)
    newUser.email = admin.email
    newUser.phone = admin.phone
    newUser.role = admin.role
    try {
      await this.adminRepository.save(newUser)
      return '注册成功'
    } catch {
      return '注册失败'
    }
  }

  async findUserById(id: number) {
    const admin = await this.adminRepository.findOneBy({ id })
    if (!admin) {
      throw new UnauthorizedException('用户不存在或 Token 无效')
    }
    const { password, ...result } = admin
    return result
  }
}
