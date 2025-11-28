import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProcessProgram } from "./entities/process-program.entity";
import { ProcessStep } from "./entities/process-step.entity";
import { ProcessFunction } from "./entities/process-function.entity";
import { ProcessFunctionArg } from "./entities/process-function-arg.entity";
import { ProcessController } from "./process.controller";
import { ProcessService } from "./process.service";
import { ProcessFunctionController } from "./process-function.controller";
import { ProcessFunctionService } from "./process-function.service";
import { ProcessRuntimeService } from "./process-runtime.service";
import { PlcModule } from "../plc/plc.module";

@Module({
  imports: [TypeOrmModule.forFeature([ProcessProgram, ProcessStep, ProcessFunction, ProcessFunctionArg]), PlcModule],
  controllers: [ProcessController, ProcessFunctionController],
  providers: [ProcessService, ProcessFunctionService, ProcessRuntimeService],
  exports: [ProcessService, ProcessFunctionService, ProcessRuntimeService],
})
export class ProcessModule {}
