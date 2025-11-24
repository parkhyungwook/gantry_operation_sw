import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ProcessService } from "./process.service";
import {
  CreateProcessProgramDto,
  UpdateProcessProgramDto,
  ProcessProgramResponseDto,
  ProcessStepResponseDto,
} from "./dto/process-program.dto";
import { ProcessProgram } from "./entities/process-program.entity";
import { DeployProcessProgramDto } from "./dto/process-runtime.dto";
import { ProcessRuntimeService } from "./process-runtime.service";

@Controller("process/programs")
@ApiTags("process-programs")
export class ProcessController {
  constructor(private readonly processService: ProcessService, private readonly runtimeService: ProcessRuntimeService) {}

  @Get()
  @ApiOperation({ summary: "List process programs" })
  @ApiResponse({ status: 200, type: [ProcessProgramResponseDto] })
  async getPrograms(): Promise<ProcessProgramResponseDto[]> {
    const programs = await this.processService.findAll();
    return programs.map((p) => this.toDto(p));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get process program detail" })
  @ApiParam({ name: "id", description: "Program ID" })
  @ApiResponse({ status: 200, type: ProcessProgramResponseDto })
  async getProgram(@Param("id", ParseIntPipe) id: number): Promise<ProcessProgramResponseDto> {
    const program = await this.processService.findOne(id);
    return this.toDto(program);
  }

  @Post()
  @ApiOperation({ summary: "Create process program" })
  @ApiBody({ type: CreateProcessProgramDto })
  @ApiResponse({ status: 201, type: ProcessProgramResponseDto })
  async createProgram(@Body() dto: CreateProcessProgramDto): Promise<ProcessProgramResponseDto> {
    const program = await this.processService.createProgram(dto);
    return this.toDto(program);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update process program" })
  @ApiParam({ name: "id", description: "Program ID" })
  @ApiBody({ type: UpdateProcessProgramDto })
  @ApiResponse({ status: 200, type: ProcessProgramResponseDto })
  async updateProgram(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProcessProgramDto): Promise<ProcessProgramResponseDto> {
    const program = await this.processService.updateProgram(id, dto);
    return this.toDto(program);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete process program" })
  @ApiParam({ name: "id", description: "Program ID" })
  @ApiResponse({ status: 204 })
  async deleteProgram(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.processService.deleteProgram(id);
  }

  @Post(":id/activate")
  @ApiOperation({ summary: "Activate this program (others deactivated)" })
  @ApiParam({ name: "id", description: "Program ID" })
  @ApiResponse({ status: 200, type: ProcessProgramResponseDto })
  async activateProgram(@Param("id", ParseIntPipe) id: number): Promise<ProcessProgramResponseDto> {
    const program = await this.processService.activateProgram(id);
    return this.toDto(program);
  }

  @Post(":id/deploy")
  @ApiOperation({ summary: "Compile and deploy program to PLC" })
  @ApiParam({ name: "id", description: "Program ID" })
  @ApiBody({ type: DeployProcessProgramDto, required: false })
  @ApiResponse({ status: 200 })
  async deployProgram(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: DeployProcessProgramDto
  ): Promise<{ message: string; words: number[]; baseAddress: number; stepWords: number }> {
    const result = await this.runtimeService.deployProgram(id, dto);
    return {
      message: "Program deployed to PLC",
      words: result.words,
      baseAddress: result.baseAddress,
      stepWords: result.stepWords,
    };
  }

  private toDto(program: ProcessProgram): ProcessProgramResponseDto {
    const dto: ProcessProgramResponseDto = {
      id: program.id,
      name: program.name,
      baseAddress: program.baseAddress,
      stepWords: program.stepWords,
      version: program.version,
      description: program.description,
      isActive: program.isActive,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
      steps: (program.steps || [])
        .sort((a, b) => a.sequence - b.sequence)
        .map((s): ProcessStepResponseDto => ({
          id: s.id,
          sequence: s.sequence,
          functionId: s.functionId,
          args: s.args,
        })),
    };
    return dto;
  }
}
