import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ProcessStep } from "./process-step.entity";

@Entity("process_programs")
export class ProcessProgram {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: 1 })
  version: number;

  @Column({ default: 1000 })
  baseAddress: number;

  @Column({ default: 10 })
  stepWords: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProcessStep, (step) => step.program, { cascade: true })
  steps: ProcessStep[];
}
