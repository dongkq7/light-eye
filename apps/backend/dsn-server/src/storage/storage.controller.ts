import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common'
import { StorageService } from './storage.service'

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('/data')
  getData() {
    return this.storageService.getData()
  }

  @Post('/tracing/:app_id')
  // sendBeacon 要求服务器返回 200、204 或 205，否则浏览器可能认为发送失败并重试，204无响应体更高效
  @HttpCode(204)
  async tracing(@Param() { app_id }: { app_id: string }, @Body() body: any) {
    await this.storageService.tracing(app_id, body)
    return { message: 'Tracing data inserted successfully' }
  }

  @Get('/bugs')
  bugs() {
    return this.storageService.bugs()
  }
}
