import { Application } from '../../application/entities/application.entity'
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  username: string

  @Column()
  password: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  phone: string

  @Column({ nullable: true })
  role: string

  @OneToMany(() => Application, application => application.admin, {
    cascade: true // 是否做级联
  })
  applications: Application[] // 一个用户可以创建多个Application
}
