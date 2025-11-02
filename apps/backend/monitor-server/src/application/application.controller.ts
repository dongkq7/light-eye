import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { ApplicationService } from './application.service'
import { Admin } from '../admin/entities/admin.entity'
import { Application } from './entities/application.entity'
import { CreateApplicationDto } from './dto/create-application.dto'
import { AuthGuard } from '@nestjs/passport'
import { Request } from 'express'

@Controller('application')
@UseGuards(AuthGuard('jwt'))
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  async create(@Body() body: CreateApplicationDto, @Req() req: Request) {
    return await this.applicationService.create(body, req.user.id)
  }

  @Get()
  async findAll(@Req() req: Request) {
    return await this.applicationService.findAll(req.user.id)
  }
}
