import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { FormatResponseInterceptor } from './common/interceptors/format-response.interceptor'
import { AuthExceptionFilter } from './common/filters/auth-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors()
  app.useGlobalInterceptors(new FormatResponseInterceptor())
  app.useGlobalFilters(new AuthExceptionFilter())
  await app.listen(process.env.PORT ?? 6000)
}
bootstrap()
