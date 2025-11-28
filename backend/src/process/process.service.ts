import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcessProgram } from "./entities/process-program.entity";
import { ProcessStep } from "./entities/process-step.entity";
import { CreateProcessProgramDto, UpdateProcessProgramDto } from "./dto/process-program.dto";

@Injectable()
export class ProcessService {
  constructor(
    @InjectRepository(ProcessProgram)
    private readonly programRepo: Repository<ProcessProgram>,
    @InjectRepository(ProcessStep)
    private readonly stepRepo: Repository<ProcessStep>,
  ) {}

  async createProgram(dto: CreateProcessProgramDto): Promise<ProcessProgram> {
    const program = this.programRepo.create({
      name: dto.name,
      baseAddress: dto.baseAddress ?? 1000,
      stepWords: dto.stepWords ?? 10,
      version: dto.version ?? 1,
      description: dto.description,
      isActive: dto.isActive ?? false,
    });
    const saved = await this.programRepo.save(program);

    if (dto.steps?.length) {
      const steps = dto.steps.map((step) =>
        this.stepRepo.create({
          program: { id: saved.id } as ProcessProgram,
          sequence: step.sequence,
          functionId: step.functionId,
          args: step.args,
        }),
      );
      await this.stepRepo.save(steps);
    }

    return this.findOne(saved.id);
  }

  async findAll(): Promise<ProcessProgram[]> {
    const programs = await this.programRepo.find({ relations: ["steps"], order: { id: "ASC" } });
    return programs.map((p) => ({
      ...p,
      steps: (p.steps || []).sort((a, b) => a.sequence - b.sequence),
    } as ProcessProgram));
  }

  async findOne(id: number): Promise<ProcessProgram> {
    const program = await this.programRepo.findOne({ where: { id }, relations: ["steps"] });
    if (!program) {
      throw new NotFoundException(`Process program ${id} not found`);
    }
    program.steps = (program.steps || []).sort((a, b) => a.sequence - b.sequence);
    return program;
  }

  async updateProgram(id: number, dto: UpdateProcessProgramDto): Promise<ProcessProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException(`Process program ${id} not found`);
    }

    if (dto.name !== undefined) program.name = dto.name;
    if (dto.baseAddress !== undefined) program.baseAddress = dto.baseAddress;
    if (dto.stepWords !== undefined) program.stepWords = dto.stepWords;
    if (dto.version !== undefined) program.version = dto.version;
    if (dto.description !== undefined) program.description = dto.description;
    if (dto.isActive !== undefined) program.isActive = dto.isActive;

    await this.programRepo.save(program);

    if (dto.steps) {
      await this.stepRepo.createQueryBuilder().delete().where("programId = :id", { id }).execute();
      if (dto.steps.length) {
        const steps = dto.steps.map((step) =>
          this.stepRepo.create({
            program: { id } as ProcessProgram,
            sequence: step.sequence,
            functionId: step.functionId,
            args: step.args,
          }),
        );
        await this.stepRepo.save(steps);
      }
    }

    return this.findOne(id);
  }

  async deleteProgram(id: number): Promise<void> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException(`Process program ${id} not found`);
    }
    await this.programRepo.delete(id);
  }

  async activateProgram(id: number): Promise<ProcessProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException(`Process program ${id} not found`);
    }

    await this.programRepo.createQueryBuilder().update(ProcessProgram).set({ isActive: false }).execute();
    program.isActive = true;
    await this.programRepo.save(program);

    return this.findOne(id);
  }
}
