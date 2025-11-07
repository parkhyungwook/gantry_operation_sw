import { IsString, IsNumber, IsArray, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceCode } from '../mc-protocol.service';

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

export class SetPollingIntervalDto {
  @ApiProperty({ description: '폴링 간격 (밀리초)', example: 1000 })
  @IsNumber()
  intervalMs: number;
}

export class PlcDataResponseDto {
  @ApiProperty({ description: '읽은 데이터 값 (숫자 배열 또는 문자열)' })
  value: number[] | string;

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

  @ApiProperty({ description: '디바이스 코드' })
  device: number;

  @ApiProperty({ description: '시작 주소' })
  address: number;

  @ApiProperty({ description: '워드 수' })
  count: number;

  @ApiProperty({ description: '데이터 타입' })
  type: string;

  @ApiPropertyOptional({ description: '인코딩' })
  encoding?: string;

  @ApiPropertyOptional({ description: '최대 문자 수' })
  maxChars?: number;
}
