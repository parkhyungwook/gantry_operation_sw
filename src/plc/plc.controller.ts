import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PlcPollingService } from './plc-polling.service';
import {
  RegisterDataPointDto,
  WriteNumbersDto,
  WriteStringDto,
  SetPollingIntervalDto,
  PlcDataResponseDto,
  PlcCacheResponseDto,
  PollingStatusDto,
  DataPointInfoDto,
} from './dto/plc-data.dto';

@Controller('plc')
export class PlcController {
  private readonly logger = new Logger(PlcController.name);

  constructor(private readonly pollingService: PlcPollingService) {}

  // ==================== Data Points ====================
  @Get('data-points')
  @ApiTags('data-points')
  @ApiOperation({
    summary: '데이터 포인트 목록 조회',
    description: 'DB에 등록된 모든 데이터 포인트를 조회합니다.'
  })
  @ApiResponse({ status: 200, description: '데이터 포인트 목록 반환 성공', type: [DataPointInfoDto] })
  async getRegisteredDataPoints(): Promise<DataPointInfoDto[]> {
    return this.pollingService.getDataPoints();
  }

  @Post('data-points')
  @ApiTags('data-points')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '데이터 포인트 등록',
    description: '새로운 PLC 데이터 포인트를 DB에 등록합니다.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'custom_sensor' },
        description: { type: 'string', example: '사용자 정의 센서' },
        device: { type: 'number', example: 168, description: 'Device code (D=168, R=175, etc.)' },
        address: { type: 'number', example: 2000 },
        count: { type: 'number', example: 5 },
        type: { type: 'string', enum: ['number', 'string'], example: 'number' },
        encoding: { type: 'string', enum: ['ascii', 'utf16le'] },
        maxChars: { type: 'number' },
      },
      required: ['key', 'description', 'device', 'address', 'count', 'type'],
    },
  })
  @ApiResponse({ status: 201, description: '데이터 포인트 등록 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async registerDataPoint(@Body() dto: any): Promise<{ message: string; dataPoint: DataPointInfoDto }> {
    const dataPoint = await this.pollingService.registerDataPoint(dto);

    return {
      message: `Data point ${dto.key} registered successfully`,
      dataPoint,
    };
  }

  @Delete('data-points/:key')
  @ApiTags('data-points')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '데이터 포인트 삭제',
    description: 'DB에서 데이터 포인트를 삭제합니다.'
  })
  @ApiParam({
    name: 'key',
    description: '삭제할 데이터 포인트 키',
    example: 'temperature_sensor'
  })
  @ApiResponse({ status: 204, description: '데이터 포인트 삭제 성공' })
  async unregisterDataPoint(@Param('key') key: string): Promise<void> {
    await this.pollingService.unregisterDataPoint(key);
  }

  // ==================== Polling ====================
  @Get('polling/status')
  @ApiTags('polling')
  @ApiOperation({ summary: '폴링 상태 조회', description: '현재 폴링 상태와 등록된 데이터 포인트를 조회합니다.' })
  @ApiResponse({ status: 200, description: '상태 정보 반환 성공', type: PollingStatusDto })
  async getStatus(): Promise<PollingStatusDto> {
    const dataPoints = await this.pollingService.getDataPoints();
    return {
      isPolling: this.pollingService.isPolling(),
      intervalMs: this.pollingService.getIntervalMs(),
      registeredDataPoints: dataPoints.map((dp) => dp.key),
    };
  }

  @Post('polling/start')
  @ApiTags('polling')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '폴링 시작', description: '등록된 데이터 포인트에 대한 주기적 폴링을 시작합니다.' })
  @ApiResponse({ status: 200, description: '폴링 시작 성공' })
  startPolling(): { message: string } {
    this.pollingService.startPolling();
    return { message: 'Polling started' };
  }

  @Post('polling/stop')
  @ApiTags('polling')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '폴링 중지', description: '실행 중인 폴링을 중지합니다.' })
  @ApiResponse({ status: 200, description: '폴링 중지 성공' })
  stopPolling(): { message: string } {
    this.pollingService.stopPolling();
    return { message: 'Polling stopped' };
  }

  @Post('polling/interval')
  @ApiTags('polling')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '폴링 간격 설정', description: '폴링 주기를 밀리초 단위로 설정합니다.' })
  @ApiBody({ type: SetPollingIntervalDto })
  @ApiResponse({ status: 200, description: '폴링 간격 설정 성공' })
  setPollingInterval(@Body() dto: SetPollingIntervalDto): { message: string } {
    this.pollingService.setPollingInterval(dto.intervalMs);
    return { message: `Polling interval set to ${dto.intervalMs}ms` };
  }

  // ==================== Data ====================
  @Get('data/:key')
  @ApiTags('data')
  @ApiOperation({
    summary: '데이터 읽기',
    description: 'DB에 저장된 최신 데이터를 조회합니다.'
  })
  @ApiParam({
    name: 'key',
    description: '읽을 데이터 포인트 키',
    example: 'temperature_sensor'
  })
  @ApiResponse({ status: 200, description: '데이터 읽기 성공', type: PlcDataResponseDto })
  @ApiResponse({ status: 404, description: '데이터를 찾을 수 없음' })
  async readData(@Param('key') key: string): Promise<PlcDataResponseDto> {
    const item = await this.pollingService.getCacheItem(key);
    if (!item) {
      throw new BadRequestException(
        `Data for '${key}' not found in DB. Make sure polling is running and the data point is registered.`
      );
    }
    return {
      value: item.value,
      timestamp: item.timestamp,
      error: item.error,
    };
  }

  @Post('data/:key')
  @ApiTags('data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '데이터 쓰기',
    description: 'PLC에 데이터를 쓰고 DB에 저장합니다.'
  })
  @ApiParam({
    name: 'key',
    description: '쓸 데이터 포인트 키',
    example: 'temperature_sensor'
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            values: {
              type: 'array',
              items: { type: 'number' },
              description: '숫자 배열 (number 타입 데이터 포인트용)',
              example: [100, 200, 300]
            }
          },
          required: ['values']
        },
        {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              description: '문자열 (string 타입 데이터 포인트용)',
              example: 'HELLO'
            }
          },
          required: ['value']
        }
      ]
    }
  })
  @ApiResponse({ status: 200, description: 'PLC 쓰기 및 DB 저장 성공' })
  @ApiResponse({ status: 400, description: '잘못된 데이터 타입 또는 데이터 포인트를 찾을 수 없음' })
  async writeData(
    @Param('key') key: string,
    @Body() body: WriteNumbersDto | WriteStringDto,
  ): Promise<{ message: string; saved: PlcDataResponseDto }> {
    const definition = await this.pollingService.getDataPoint(key);
    if (!definition) {
      throw new BadRequestException(`Data point '${key}' not found`);
    }

    let value: number[] | string;

    if (definition.type === 'number') {
      if ('values' in body) {
        value = body.values;
      } else {
        throw new BadRequestException(`Data point ${key} expects number array (values), but got string`);
      }
    } else {
      if ('value' in body) {
        value = body.value;
      } else {
        throw new BadRequestException(`Data point ${key} expects string (value), but got number array`);
      }
    }

    try {
      await this.pollingService.writeValue(key, value);
      const saved = await this.pollingService.getCacheItem(key);

      return {
        message: `Data written to PLC and saved to DB for ${key}`,
        saved: {
          value: saved!.value,
          timestamp: saved!.timestamp,
          error: saved!.error,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to write to ${key}`, error.stack);
      throw error;
    }
  }
}
