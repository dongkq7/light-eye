import { Body, Controller, Post, ValidationPipe } from '@nestjs/common'
import { AdminService } from './admin.service'
import { RegisterDto } from './dto/register.dto'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('/register')
  async create(@Body(ValidationPipe) admin: RegisterDto) {
    return await this.adminService.register(admin)
  }

  @Post('/validate')
  async validate(@Body() body) {
    return this.adminService.validateUser(body.username, body.password)
  }
}
