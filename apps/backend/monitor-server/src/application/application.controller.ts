import { Body, Controller, Post } from '@nestjs/common'
import { ApplicationService } from './application.service'
import { Admin } from '../admin/entities/admin.entity'
import { Application } from './entities/application.entity'

@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  create(@Body() body) {
    const admin = new Admin()
    admin.id = 1
    const application = new Application(body)
    application.admin = admin
    return this.applicationService.create(application)
  }
}
