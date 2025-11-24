import { IsString, IsNumber, IsOptional, IsIn, Min, Max, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PlcValue } from "../plc.types";

export class CreateTagDto {
  @ApiProperty({ description: "태그 키 (고유 이름)", example: "x_servo_position" })
  @IsString()
  key: string;

  @ApiProperty({ description: "설명", example: "X축 서보 위치" })
  @IsString()
  description: string;

  @ApiProperty({ description: "DataSet ID", example: 1 })
  @IsNumber()
  dataSetId: number;

  @ApiProperty({ description: "오프셋 (워드 단위)", example: 0 })
  @IsNumber()
  @Min(0)
  offset: number;

  @ApiProperty({
    description: "데이터 타입",
    example: "int16",
    enum: ["int16", "int32", "real", "string", "bool"],
  })
  @IsString()
  @IsIn(["int16", "int32", "real", "string", "bool"])
  dataType: string;

  @ApiPropertyOptional({ description: "워드 길이 (string일 때 사용)", example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  wordLength?: number;

  @ApiPropertyOptional({ description: "비트 위치 (bool일 때 사용, 0-15)", example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(15)
  bitPosition?: number;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ description: "설명" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "오프셋" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: "데이터 타입" })
  @IsOptional()
  @IsString()
  @IsIn(["int16", "int32", "real", "string", "bool"])
  dataType?: string;

  @ApiPropertyOptional({ description: "워드 길이" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  wordLength?: number;

  @ApiPropertyOptional({ description: "비트 위치" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(15)
  bitPosition?: number;
}

export class TagResponseDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  dataSetId: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  dataType: string;

  @ApiProperty()
  wordLength: number;

  @ApiPropertyOptional()
  bitPosition?: number;
}

export class TagValueResponseDto {
  @ApiProperty({ description: "태그 값" })
  value: PlcValue;

  @ApiProperty({ description: "타임스탬프" })
  timestamp: Date;

  @ApiPropertyOptional({ description: "에러 메시지" })
  error?: string;
}

export class WriteTagValueDto {
  @ApiProperty({
    description: "쓸 값 (타입에 따라 number, string, boolean)",
    example: 100,
  })
  @IsNotEmpty({ message: "value is required" })
  value!: any; // number | string | boolean
}
