import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Application } from './entities/application.entity'
import { Repository } from 'typeorm/repository/Repository'

@Injectable()
export class ApplicationService {
  constructor(@InjectRepository(Application) private readonly applicationRepository: Repository<Application>) {}

  async create(application) {
    await this.applicationRepository.save(application)
    return application
  }
}
