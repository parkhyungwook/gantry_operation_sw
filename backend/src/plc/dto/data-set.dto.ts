import { IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDataSetDto {
  @ApiProperty({ description: "DataSet 이름", example: "고속 센서 데이터" })
  @IsString()
  name: string;

  @ApiProperty({ description: "주소 타입 (D, R, M, X, Y)", example: "D" })
  @IsString()
  @IsIn(["D", "R", "M", "X", "Y"])
  addressType: string;

  @ApiProperty({ description: "시작 주소", example: 1000 })
  @IsNumber()
  @Min(0)
  startAddress: number;

  @ApiProperty({ description: "워드 개수", example: 100 })
  @IsNumber()
  @Min(1)
  length: number;

  @ApiProperty({ description: "폴링 주기 (ms)", example: 100, default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  pollingInterval?: number;

  @ApiPropertyOptional({ description: "활성화 여부", example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateDataSetDto {
  @ApiPropertyOptional({ description: "DataSet 이름" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "폴링 주기 (ms)" })
  @IsOptional()
  @IsNumber()
  @Min(10)
  pollingInterval?: number;

  @ApiPropertyOptional({ description: "활성화 여부" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class DataSetResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  addressType: string;

  @ApiProperty()
  startAddress: number;

  @ApiProperty()
  length: number;

  @ApiProperty()
  pollingInterval: number;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty({ required: false })
  lastUpdatedAt?: string;

  @ApiProperty({ required: false, type: [Number] })
  values?: number[];
}
