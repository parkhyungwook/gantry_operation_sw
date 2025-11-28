import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ProcessFunctionService } from "./process-function.service";
import {
  CreateProcessFunctionDto,
  UpdateProcessFunctionDto,
  ProcessFunctionResponseDto,
  ProcessFunctionArgResponseDto,
} from "./dto/process-function.dto";
import { ProcessFunction } from "./entities/process-function.entity";

@Controller("process/functions")
@ApiTags("process-functions")
export class ProcessFunctionController {
  constructor(private readonly service: ProcessFunctionService) {}

  @Get()
  @ApiOperation({ summary: "List process functions" })
  @ApiResponse({ status: 200, type: [ProcessFunctionResponseDto] })
  async list(): Promise<ProcessFunctionResponseDto[]> {
    const data = await this.service.findAll();
    return data.map((f) => this.toDto(f));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get process function" })
  @ApiParam({ name: "id", description: "Function ID" })
  @ApiResponse({ status: 200, type: ProcessFunctionResponseDto })
  async get(@Param("id", ParseIntPipe) id: number): Promise<ProcessFunctionResponseDto> {
    const fn = await this.service.findOne(id);
    return this.toDto(fn);
  }

  @Post()
  @ApiOperation({ summary: "Create process function" })
  @ApiBody({ type: CreateProcessFunctionDto })
  @ApiResponse({ status: 201, type: ProcessFunctionResponseDto })
  async create(@Body() dto: CreateProcessFunctionDto): Promise<ProcessFunctionResponseDto> {
    const fn = await this.service.create(dto);
    return this.toDto(fn);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update process function (replaces args if provided)" })
  @ApiParam({ name: "id", description: "Function ID" })
  @ApiBody({ type: UpdateProcessFunctionDto })
  @ApiResponse({ status: 200, type: ProcessFunctionResponseDto })
  async update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProcessFunctionDto): Promise<ProcessFunctionResponseDto> {
    const fn = await this.service.update(id, dto);
    return this.toDto(fn);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete process function" })
  @ApiParam({ name: "id", description: "Function ID" })
  @ApiResponse({ status: 204 })
  async remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.service.delete(id);
  }

  private toDto(fn: ProcessFunction): ProcessFunctionResponseDto {
    return {
      id: fn.id,
      code: fn.code,
      name: fn.name,
      description: fn.description,
      category: fn.category,
      enabled: fn.enabled,
      createdAt: fn.createdAt,
      updatedAt: fn.updatedAt,
      args: (fn.args || []).map(
        (a): ProcessFunctionArgResponseDto => ({
          id: a.id,
          position: a.position,
          name: a.name,
          type: a.type,
          required: a.required,
        })
      ),
    };
  }
}
