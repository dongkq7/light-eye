import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator'

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9#$%_-]+$/, {
    message: '用户名只能包含字母、数字或#、¥、%、_、-'
  })
  username: string

  @IsString()
  @IsNotEmpty()
  @Length(6, 30)
  password: string

  @IsEmail()
  email: string

  phone: string

  role: string
}
