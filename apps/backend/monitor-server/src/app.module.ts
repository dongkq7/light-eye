import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApplicationModule } from './application/application.module'
import { AdminModule } from './admin/admin.module'
import { JwtModule } from '@nestjs/jwt'
import { AuthModule } from './auth/auth.module'
import { APP_GUARD } from '@nestjs/core'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      username: 'postgres',
      password: '123456',
      database: 'postgres',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true
    }),
    JwtModule.register({
      global: true,
      secret: 'HelloWorld',
      signOptions: { expiresIn: '1d' }
    }),
    ApplicationModule,
    AdminModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
