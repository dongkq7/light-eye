import { IsNotEmpty } from 'class-validator'

export enum Application {
  VUE = 'vue',
  REACT = 'react',
  VANILLA = 'vanilla'
}

export class CreateApplicationDto {
  @IsNotEmpty()
  name: string
  @IsNotEmpty()
  type: 'vue' | 'react' | 'vanilla'
  description: string
}
