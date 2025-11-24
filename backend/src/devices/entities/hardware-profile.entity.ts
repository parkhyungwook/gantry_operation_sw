import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Machine } from "./machine.entity";
import { Stocker } from "./stocker.entity";
import { Turnover } from "./turnover.entity";
import { BufferUnit } from "./buffer.entity";
import { Chute } from "./chute.entity";

@Entity("hardware_profiles")
export class HardwareProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  applied: boolean;

  @Column()
  glName: string;

  @Column({ nullable: true })
  controller?: string;

  @Column({ nullable: true })
  host?: string;

  @Column({ nullable: true })
  port?: number;

  @Column({ nullable: true })
  series?: string;

  @Column({ nullable: true })
  axes?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Machine, (m) => m.profile, { cascade: true })
  machines: Machine[];

  @OneToMany(() => Stocker, (s) => s.profile, { cascade: true })
  stockers: Stocker[];

  @OneToMany(() => Turnover, (t) => t.profile, { cascade: true })
  turnovers: Turnover[];

  @OneToMany(() => BufferUnit, (b) => b.profile, { cascade: true })
  buffers: BufferUnit[];

  @OneToMany(() => Chute, (c) => c.profile, { cascade: true })
  chutes: Chute[];
}
