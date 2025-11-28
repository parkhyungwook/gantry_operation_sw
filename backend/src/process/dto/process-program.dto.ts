import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class CreateProcessStepDto {
  @ApiProperty({ description: "Execution order (1-based)", example: 1 })
  @IsInt()
  @Min(1)
  sequence: number;

  @ApiProperty({ description: "Function identifier", example: 3 })
  @IsInt()
  @Min(1)
  functionId: number;

  @ApiPropertyOptional({ description: "Arguments passed to the function" })
  @IsOptional()
  @IsObject()
  args?: Record<string, any>;
}

export class CreateProcessProgramDto {
  @ApiProperty({ description: "Program name", example: "Welding sequence A" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Base D address for deployment", example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  baseAddress?: number;

  @ApiPropertyOptional({ description: "Word length per step", example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  stepWords?: number;

  @ApiPropertyOptional({ description: "Version number", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: "Program description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Mark as active program", default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: "Ordered steps that compose the program",
    type: [CreateProcessStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcessStepDto)
  steps: CreateProcessStepDto[];
}

export class UpdateProcessProgramDto {
  @ApiPropertyOptional({ description: "Program name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Base D address for deployment" })
  @IsOptional()
  @IsInt()
  @Min(0)
  baseAddress?: number;

  @ApiPropertyOptional({ description: "Word length per step" })
  @IsOptional()
  @IsInt()
  @Min(1)
  stepWords?: number;

  @ApiPropertyOptional({ description: "Version number" })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: "Program description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Mark as active program" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Replace steps with this list (full replacement)",
    type: [CreateProcessStepDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcessStepDto)
  steps?: CreateProcessStepDto[];
}

export class ProcessStepResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  sequence: number;

  @ApiProperty()
  functionId: number;

  @ApiProperty({ required: false })
  args?: Record<string, any>;
}

export class ProcessProgramResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  baseAddress: number;

  @ApiProperty()
  stepWords: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [ProcessStepResponseDto] })
  steps: ProcessStepResponseDto[];
}
