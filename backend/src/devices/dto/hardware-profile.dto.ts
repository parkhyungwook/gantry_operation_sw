import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class MachineDto {
  @ApiProperty({ example: 1, description: "Number (1~5)" })
  @IsInt()
  @Min(1)
  @Max(5)
  no: number;

  @ApiProperty({ example: "machine1", description: "Machine name" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Controller name" })
  @IsOptional()
  @IsString()
  controller?: string;

  @ApiPropertyOptional({ description: "Host IP/hostname" })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ description: "Port" })
  @IsOptional()
  @IsInt()
  port?: number;

  @ApiPropertyOptional({ description: "Machine type" })
  @IsOptional()
  @IsString()
  type?: string;
}

export class StockerDto {
  @ApiProperty({ example: 1, description: "Number (1~4)" })
  @IsInt()
  @Min(1)
  @Max(4)
  no: number;

  @ApiProperty({ example: "stocker1" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Stocker type" })
  @IsOptional()
  @IsString()
  type?: string;
}

export class TurnoverDto {
  @ApiProperty({ example: 1, description: "Number (1~4)" })
  @IsInt()
  @Min(1)
  @Max(4)
  no: number;

  @ApiProperty({ example: "turnover1" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "modeA" })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: "Turnover type" })
  @IsOptional()
  @IsString()
  type?: string;
}

export class BufferDto {
  @ApiProperty({ example: 1, description: "Number (1~4)" })
  @IsInt()
  @Min(1)
  @Max(4)
  no: number;

  @ApiPropertyOptional({ example: "buffer1" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "Whether this buffer exists", default: false })
  @IsBoolean()
  exists: boolean;
}

export class ChuteDto {
  @ApiProperty({ example: 1, description: "Number (1~5)" })
  @IsInt()
  @Min(1)
  @Max(5)
  no: number;

  @ApiPropertyOptional({ example: "chute1" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "Whether this chute exists", default: false })
  @IsBoolean()
  exists: boolean;
}

export class CreateHardwareProfileDto {
  @ApiProperty({ example: "GL-01" })
  @IsString()
  glName: string;

  @ApiPropertyOptional({ description: "Line controller name" })
  @IsOptional()
  @IsString()
  controller?: string;

  @ApiPropertyOptional({ description: "Host IP/hostname" })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ description: "Port" })
  @IsOptional()
  @IsInt()
  port?: number;

  @ApiPropertyOptional({ description: "PLC/line series" })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional({ description: "Axes count" })
  @IsOptional()
  @IsInt()
  axes?: number;

  @ApiPropertyOptional({ description: "Mark as applied profile", default: false })
  @IsOptional()
  @IsBoolean()
  applied?: boolean;

  @ApiPropertyOptional({ type: [MachineDto], description: "Machines (1~5)" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MachineDto)
  machines?: MachineDto[];

  @ApiPropertyOptional({ type: [StockerDto], description: "Stockers (1~4)" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockerDto)
  stockers?: StockerDto[];

  @ApiPropertyOptional({ type: [TurnoverDto], description: "Turnovers (1~4)" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoverDto)
  turnovers?: TurnoverDto[];

  @ApiPropertyOptional({ type: [BufferDto], description: "Buffers (1~4)" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BufferDto)
  buffers?: BufferDto[];

  @ApiPropertyOptional({ type: [ChuteDto], description: "Chutes (1~5)" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChuteDto)
  chutes?: ChuteDto[];
}

export class UpdateHardwareProfileDto extends CreateHardwareProfileDto {}

export class MachineResponseDto extends MachineDto {
  @ApiProperty()
  id: number;
}

export class StockerResponseDto extends StockerDto {
  @ApiProperty()
  id: number;
}

export class TurnoverResponseDto extends TurnoverDto {
  @ApiProperty()
  id: number;
}

export class BufferResponseDto extends BufferDto {
  @ApiProperty()
  id: number;
}

export class ChuteResponseDto extends ChuteDto {
  @ApiProperty()
  id: number;
}

export class HardwareProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  applied: boolean;

  @ApiProperty()
  glName: string;

  @ApiProperty({ required: false })
  controller?: string;

  @ApiProperty({ required: false })
  host?: string;

  @ApiProperty({ required: false })
  port?: number;

  @ApiProperty({ required: false })
  series?: string;

  @ApiProperty({ required: false })
  axes?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [MachineResponseDto] })
  machines: MachineResponseDto[];

  @ApiProperty({ type: [StockerResponseDto] })
  stockers: StockerResponseDto[];

  @ApiProperty({ type: [TurnoverResponseDto] })
  turnovers: TurnoverResponseDto[];

  @ApiProperty({ type: [BufferResponseDto] })
  buffers: BufferResponseDto[];

  @ApiProperty({ type: [ChuteResponseDto] })
  chutes: ChuteResponseDto[];
}
