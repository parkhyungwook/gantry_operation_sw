import { IsString, IsNumber, IsArray, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceCode } from '../services/plc-communication.service';

export class RegisterDataPointDto {
  @ApiProperty({
    description: '등록할 데이터 포인트 키',
    example: 'sensor_values'
  })
  @IsString()
  key: string;
}

export class DataPointKeyDto {
  @ApiProperty({
    description: '조회할 데이터 포인트 키',
    example: 'sensor_values'
  })
  @IsString()
  key: string;
}

export class WriteNumbersDto {
  @ApiProperty({ description: '쓸 숫자 배열', example: [100, 200, 300] })
  @IsArray()
  @IsNumber({}, { each: true })
  values: number[];
}

export class WriteStringDto {
  @ApiProperty({ description: '쓸 문자열', example: 'HELLO' })
  @IsString()
  value: string;
}

export class WriteBoolDto {
  @ApiProperty({ description: '쓸 불린 값', example: true })
  @IsBoolean()
  value: boolean;
}

export class SetPollingIntervalDto {
  @ApiProperty({ description: '폴링 간격 (밀리초)', example: 1000 })
  @IsNumber()
  intervalMs: number;
}

export class PlcDataResponseDto {
  @ApiProperty({ description: '읽은 데이터 값 (숫자 배열, 문자열, 또는 불린)' })
  value: number[] | string | boolean;

  @ApiProperty({ description: '데이터 읽은 시간' })
  timestamp: Date;

  @ApiPropertyOptional({ description: '에러 메시지 (에러 발생시)' })
  error?: string;
}

export class PlcCacheResponseDto {
  [key: string]: PlcDataResponseDto;
}

export class PollingStatusDto {
  @ApiProperty({ description: '폴링 실행 중 여부', example: true })
  isPolling: boolean;

  @ApiProperty({ description: '현재 폴링 간격 (밀리초)', example: 1000 })
  intervalMs: number;

  @ApiProperty({ description: '등록된 데이터 포인트 키 목록', example: ['sensor_values', 'device_name'] })
  registeredDataPoints: string[];
}

export class DataPointInfoDto {
  @ApiProperty({ description: '데이터 포인트 키' })
  key: string;

  @ApiProperty({ description: '설명' })
  description: string;

  @ApiProperty({ description: '주소 타입 (D, R, M, X, Y)' })
  addressType: string;

  @ApiProperty({ description: '시작 주소' })
  address: number;

  @ApiProperty({ description: 'number 타입: 워드 수, string 타입: 문자 수' })
  length: number;

  @ApiPropertyOptional({ description: '비트 위치 (0-15, bool 타입 전용)' })
  bit?: number;

  @ApiProperty({ description: '데이터 타입 (number, string, bool)' })
  type: string;
}
