import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { ProcessFunction } from "./process-function.entity";

@Entity("process_function_args")
@Unique(["functionId", "position"])
export class ProcessFunctionArg {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  functionId: number;

  @Column()
  position: number; // 1-based ordering for args

  @Column()
  name: string;

  @Column()
  type: string; // int16, int32, real, string, bool

  @Column({ default: true })
  required: boolean;

  @ManyToOne(() => ProcessFunction, (fn) => fn.args, { onDelete: "CASCADE" })
  @JoinColumn({ name: "functionId" })
  func: ProcessFunction;
}
