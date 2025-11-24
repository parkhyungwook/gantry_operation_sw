import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

const DATA_TYPES = ["int16", "int32", "real", "string", "bool"];

export class ProcessFunctionArgDto {
  @ApiProperty({ example: 1, description: "1-based argument position" })
  @IsInt()
  @Min(1)
  position: number;

  @ApiProperty({ example: "target_position" })
  @IsString()
  name: string;

  @ApiProperty({ example: "real", enum: DATA_TYPES })
  @IsString()
  @IsIn(DATA_TYPES)
  type: string;

  @ApiPropertyOptional({ description: "Argument required", default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateProcessFunctionDto {
  @ApiProperty({ example: 5, description: "Function code written to PLC" })
  @IsInt()
  @Min(1)
  code: number;

  @ApiProperty({ example: "PickAndPlace" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Category/group" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Enable function", default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ type: [ProcessFunctionArgDto], description: "Argument definitions" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessFunctionArgDto)
  args?: ProcessFunctionArgDto[];
}

export class UpdateProcessFunctionDto extends CreateProcessFunctionDto {}

export class ProcessFunctionArgResponseDto extends ProcessFunctionArgDto {
  @ApiProperty()
  id: number;
}

export class ProcessFunctionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [ProcessFunctionArgResponseDto] })
  args: ProcessFunctionArgResponseDto[];
}
