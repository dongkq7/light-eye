import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Application } from './entities/application.entity'
import { Repository } from 'typeorm/repository/Repository'
import { CreateApplicationDto } from './dto/create-application.dto'
import { Admin } from '../admin/entities/admin.entity'
import { nanoid } from 'nanoid'

@Injectable()
export class ApplicationService {
  constructor(@InjectRepository(Application) private readonly applicationRepository: Repository<Application>) {}

  async create(body: CreateApplicationDto, userId: number) {
    const admin = new Admin()
    admin.id = userId
    const application = new Application(body)
    // appId是application.type+nanoid(6)，确保每个应用的ID唯一
    application.appId = application.type + nanoid(6)
    application.admin = admin // 关联管理员
    await this.applicationRepository.save(application)
  }

  async findAll(userId: number) {
    const [data, count] = await this.applicationRepository.findAndCount({
      where: { admin: { id: userId } }
    })

    return {
      applications: data,
      count
    }
  }
}
