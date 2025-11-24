import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcessFunction } from "./entities/process-function.entity";
import { ProcessFunctionArg } from "./entities/process-function-arg.entity";
import { CreateProcessFunctionDto, UpdateProcessFunctionDto } from "./dto/process-function.dto";

@Injectable()
export class ProcessFunctionService {
  constructor(
    @InjectRepository(ProcessFunction)
    private readonly functionRepo: Repository<ProcessFunction>,
    @InjectRepository(ProcessFunctionArg)
    private readonly argRepo: Repository<ProcessFunctionArg>
  ) {}

  async create(dto: CreateProcessFunctionDto): Promise<ProcessFunction> {
    const func = this.functionRepo.create({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      enabled: dto.enabled ?? true,
    });
    const saved = await this.functionRepo.save(func);

    await this.replaceArgs(saved.id, dto.args);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<ProcessFunction[]> {
    const functions = await this.functionRepo.find({ relations: ["args"], order: { id: "ASC" } });
    return functions.map((f) => this.sortArgs(f));
  }

  async findOne(id: number): Promise<ProcessFunction> {
    const func = await this.functionRepo.findOne({ where: { id }, relations: ["args"] });
    if (!func) {
      throw new NotFoundException(`Process function ${id} not found`);
    }
    return this.sortArgs(func);
  }

  async update(id: number, dto: UpdateProcessFunctionDto): Promise<ProcessFunction> {
    const func = await this.functionRepo.findOne({ where: { id } });
    if (!func) {
      throw new NotFoundException(`Process function ${id} not found`);
    }

    if (dto.code !== undefined) func.code = dto.code;
    if (dto.name !== undefined) func.name = dto.name;
    if (dto.description !== undefined) func.description = dto.description;
    if (dto.category !== undefined) func.category = dto.category;
    if (dto.enabled !== undefined) func.enabled = dto.enabled;

    await this.functionRepo.save(func);
    if (dto.args !== undefined) {
      await this.replaceArgs(id, dto.args);
    }

    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const func = await this.functionRepo.findOne({ where: { id } });
    if (!func) {
      throw new NotFoundException(`Process function ${id} not found`);
    }
    await this.functionRepo.delete(id);
  }

  private async replaceArgs(functionId: number, args?: CreateProcessFunctionDto["args"]): Promise<void> {
    await this.argRepo.delete({ functionId });
    if (!args || args.length === 0) {
      return;
    }
    const entities = args.map((a) =>
      this.argRepo.create({
        functionId,
        position: a.position,
        name: a.name,
        type: a.type,
        required: a.required ?? true,
      })
    );
    await this.argRepo.save(entities);
  }

  private sortArgs(func: ProcessFunction): ProcessFunction {
    func.args = (func.args || []).sort((a, b) => a.position - b.position);
    return func;
  }
}
