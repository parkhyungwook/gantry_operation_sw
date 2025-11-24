import { BadRequestException, Injectable, NotFoundException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ProcessProgram } from "./entities/process-program.entity";
import { ProcessStep } from "./entities/process-step.entity";
import { ProcessFunction } from "./entities/process-function.entity";
import { ProcessFunctionArg } from "./entities/process-function-arg.entity";
import { DeployProcessProgramDto } from "./dto/process-runtime.dto";
import { COMMUNICATION_SERVICE, CommunicationService, DeviceCode } from "../communication/communication.types";

@Injectable()
export class ProcessRuntimeService {
  private readonly defaultBaseAddress = 1000;
  private readonly defaultStepWords = 10;

  constructor(
    @InjectRepository(ProcessProgram) private readonly programRepo: Repository<ProcessProgram>,
    @InjectRepository(ProcessStep) private readonly stepRepo: Repository<ProcessStep>,
    @InjectRepository(ProcessFunction) private readonly functionRepo: Repository<ProcessFunction>,
    @InjectRepository(ProcessFunctionArg) private readonly argRepo: Repository<ProcessFunctionArg>,
    @Inject(COMMUNICATION_SERVICE) private readonly plc: CommunicationService
  ) {}

  async deployProgram(programId: number, options: DeployProcessProgramDto): Promise<{ words: number[]; baseAddress: number; stepWords: number }> {
    const program = await this.programRepo.findOne({ where: { id: programId }, relations: ["steps"] });
    if (!program) {
      throw new NotFoundException(`Process program ${programId} not found`);
    }
    const steps = (program.steps || []).sort((a, b) => a.sequence - b.sequence);
    if (steps.length === 0) {
      throw new BadRequestException("Program has no steps");
    }

    const stepWords = options.stepWords ?? program.stepWords ?? this.defaultStepWords;
    const baseAddress = options.baseAddress ?? program.baseAddress ?? this.defaultBaseAddress;

    // Preload functions/args
    const functionIds = Array.from(new Set(steps.map((s) => s.functionId)));
    const functions = functionIds.length ? await this.functionRepo.findBy({ id: In(functionIds) }) : [];
    const args = functionIds.length ? await this.argRepo.find({ where: { functionId: In(functionIds) } }) : [];
    const fnMap = new Map<number, ProcessFunction>();
    functions.forEach((f) => fnMap.set(f.id, f));
    const argMap = new Map<number, ProcessFunctionArg[]>();
    args.forEach((a) => {
      const list = argMap.get(a.functionId) || [];
      list.push(a);
      argMap.set(a.functionId, list);
    });

    const allWords: number[] = [];

    for (const step of steps) {
      const fn = fnMap.get(step.functionId);
      if (!fn) {
        throw new BadRequestException(`Function ${step.functionId} not found for step ${step.id}`);
      }
      const fnArgs = (argMap.get(step.functionId) || []).sort((a, b) => a.position - b.position);
      const packed = this.packStep(fn, fnArgs, step.args ?? {}, stepWords);
      allWords.push(...packed);
    }

    // Write to PLC D-registers
    await this.plc.writeNumbers(DeviceCode.D, baseAddress, allWords);

    return { words: allWords, baseAddress, stepWords };
  }

  private packStep(fn: ProcessFunction, args: ProcessFunctionArg[], providedArgs: Record<string, any>, stepWords: number): number[] {
    const out: number[] = [];
    // function code first
    out.push(fn.code);

    for (const arg of args) {
      const value = providedArgs[arg.name];
      if (value === undefined || value === null) {
        if (arg.required) {
          throw new BadRequestException(`Missing required arg '${arg.name}' for function ${fn.code}`);
        } else {
          this.pushEmpty(out, arg);
          continue;
        }
      }
      this.serializeArg(out, arg, value);
    }

    // pad
    if (out.length > stepWords) {
      throw new BadRequestException(`Step for function ${fn.code} exceeds stepWords (${out.length} > ${stepWords})`);
    }
    while (out.length < stepWords) {
      out.push(0);
    }
    return out;
  }

  private pushEmpty(out: number[], arg: ProcessFunctionArg): void {
    switch (arg.type) {
      case "int16":
      case "bool":
        out.push(0);
        break;
      case "int32":
      case "real":
        out.push(0, 0);
        break;
      case "string": {
        const len = 1;
        for (let i = 0; i < len; i++) out.push(0);
        break;
      }
      default:
        out.push(0);
    }
  }

  private serializeArg(out: number[], arg: ProcessFunctionArg, value: any): void {
    switch (arg.type) {
      case "int16": {
        if (typeof value !== "number") throw new BadRequestException(`Arg '${arg.name}' must be number`);
        out.push(value & 0xffff);
        break;
      }
      case "int32": {
        if (typeof value !== "number") throw new BadRequestException(`Arg '${arg.name}' must be number`);
        const low = value & 0xffff;
        const high = (value >> 16) & 0xffff;
        out.push(low, high);
        break;
      }
      case "real": {
        if (typeof value !== "number") throw new BadRequestException(`Arg '${arg.name}' must be number`);
        const buf = Buffer.allocUnsafe(4);
        buf.writeFloatLE(value, 0);
        out.push(buf.readUInt16LE(0), buf.readUInt16LE(2));
        break;
      }
      case "string": {
        if (typeof value !== "string") throw new BadRequestException(`Arg '${arg.name}' must be string`);
        const len = 1;
        const bytes = Buffer.from(value, "ascii");
        const wordsNeeded = len;
        for (let i = 0; i < wordsNeeded; i++) {
          const lo = bytes[i * 2] ?? 0;
          const hi = bytes[i * 2 + 1] ?? 0;
          out.push((hi << 8) | lo);
        }
        break;
      }
      case "bool": {
        if (typeof value !== "boolean") throw new BadRequestException(`Arg '${arg.name}' must be boolean`);
        out.push(value ? 1 : 0);
        break;
      }
      default:
        throw new BadRequestException(`Unsupported arg type '${arg.type}'`);
    }
  }
}
