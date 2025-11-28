import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { ProcessProgram } from "./process-program.entity";

@Entity("process_steps")
export class ProcessStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sequence: number;

  @Column()
  functionId: number;

  @Column({ type: "simple-json", nullable: true })
  args?: Record<string, any>;

  @ManyToOne(() => ProcessProgram, (program) => program.steps, { onDelete: "CASCADE" })
  @JoinColumn({ name: "programId" })
  program: ProcessProgram;
}
