import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { PlcCommunicationService, DeviceCode } from './plc-communication.service';
import { PlcDbService } from './plc-db.service';
import { DataPoint } from '../entities/data-point.entity';
import { PlcCache } from '../entities/plc-cache.entity';

/**
 * PLC 비즈니스 로직 서비스
 * 폴링, 데이터 포인트 관리, 읽기/쓰기 등 비즈니스 로직 담당
 */
@Injectable()
export class PlcService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlcService.name);
  private pollingInterval: NodeJS.Timeout | null = null;
  private intervalMs = 1000; // 기본 1초 폴링

  constructor(
    private readonly communication: PlcCommunicationService,
    private readonly db: PlcDbService,
  ) {}

  /**
   * addressType 문자를 DeviceCode로 변환
   */
  private getDeviceCode(addressType: string): DeviceCode {
    const map: Record<string, DeviceCode> = {
      'D': DeviceCode.D,
      'R': DeviceCode.R,
      'M': DeviceCode.M,
      'X': DeviceCode.X,
      'Y': DeviceCode.Y,
    };
    const code = map[addressType.toUpperCase()];
    if (!code) {
      throw new BadRequestException(`Invalid address type: ${addressType}. Must be one of: D, R, M, X, Y`);
    }
    return code;
  }

  onModuleInit() {
    this.logger.log('PLC Service initialized');
  }

  onModuleDestroy() {
    this.stopPolling();
    this.logger.log('PLC Service destroyed');
  }

  // ==================== 데이터 포인트 관리 ====================
  async registerDataPoint(dataPoint: DataPoint): Promise<DataPoint> {
    const existing = await this.db.findDataPoint(dataPoint.key);

    if (existing) {
      // 업데이트
      await this.db.createDataPoint(dataPoint);
      this.logger.log(`Updated data point: ${dataPoint.key}`);
    } else {
      // 새로 생성
      await this.db.createDataPoint(dataPoint);
      this.logger.log(`Registered data point: ${dataPoint.key}`);
    }

    return this.db.findDataPoint(dataPoint.key)!;
  }

  async unregisterDataPoint(key: string): Promise<void> {
    await this.db.deleteDataPoint(key);
    this.logger.log(`Unregistered data point: ${key}`);
  }

  async getDataPoints(): Promise<DataPoint[]> {
    return this.db.findAllDataPoints();
  }

  async getDataPoint(key: string): Promise<DataPoint | null> {
    return this.db.findDataPoint(key);
  }

  // ==================== 폴링 제어 ====================
  setPollingInterval(ms: number): void {
    this.intervalMs = ms;
    if (this.pollingInterval) {
      this.stopPolling();
      this.startPolling();
    }
  }

  startPolling(): void {
    if (this.pollingInterval) {
      this.logger.warn('Polling already running');
      return;
    }

    this.logger.log(`Starting polling with interval: ${this.intervalMs}ms`);
    this.pollingInterval = setInterval(async () => {
      await this.poll();
    }, this.intervalMs);

    // 즉시 한 번 실행
    this.poll().catch((err) => {
      this.logger.error('Initial poll failed', err.stack);
    });
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.log('Polling stopped');
    }
  }

  isPolling(): boolean {
    return this.pollingInterval !== null;
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  // ==================== 폴링 로직 ====================
  private async poll(): Promise<void> {
    const dataPoints = await this.db.findAllDataPoints();

    const promises = dataPoints.map(async (dataPoint) => {
      try {
        let value: number[] | string | boolean;
        const deviceCode = this.getDeviceCode(dataPoint.addressType);

        if (dataPoint.type === 'number') {
          value = await this.communication.readNumbers(
            deviceCode,
            dataPoint.address,
            dataPoint.length,
          );
        } else if (dataPoint.type === 'string') {
          value = await this.communication.readString(
            deviceCode,
            dataPoint.address,
            'ascii',
            dataPoint.length,
          );
        } else if (dataPoint.type === 'bool') {
          if (dataPoint.bit === undefined || dataPoint.bit === null) {
            throw new BadRequestException(`Bit position is required for bool type: ${dataPoint.key}`);
          }
          value = await this.communication.readBit(
            deviceCode,
            dataPoint.address,
            dataPoint.bit,
          );
        } else {
          throw new BadRequestException(`Unknown type: ${dataPoint.type}`);
        }

        // DB에 저장
        await this.db.saveCache({
          key: dataPoint.key,
          value,
          timestamp: new Date(),
          error: undefined,
        });
      } catch (error) {
        this.logger.error(`Failed to poll ${dataPoint.key}`, error.stack);

        // 에러 정보 저장
        await this.db.saveCache({
          key: dataPoint.key,
          value: dataPoint.type === 'number' ? [] : dataPoint.type === 'bool' ? false : '',
          timestamp: new Date(),
          error: error.message,
        });
      }
    });

    await Promise.allSettled(promises);
  }

  // ==================== 데이터 읽기/쓰기 ====================
  async getCacheItem(key: string): Promise<PlcCache | null> {
    return this.db.findCache(key);
  }

  async getCache(): Promise<Record<string, PlcCache>> {
    const items = await this.db.findAllCache();
    const result: Record<string, PlcCache> = {};
    items.forEach((item) => {
      result[item.key] = item;
    });
    return result;
  }

  async readOnce(key: string): Promise<number[] | string | boolean> {
    const definition = await this.db.findDataPoint(key);
    if (!definition) {
      throw new BadRequestException(`Data point '${key}' not found`);
    }

    const deviceCode = this.getDeviceCode(definition.addressType);

    if (definition.type === 'number') {
      return this.communication.readNumbers(
        deviceCode,
        definition.address,
        definition.length,
      );
    } else if (definition.type === 'string') {
      return this.communication.readString(
        deviceCode,
        definition.address,
        'ascii',
        definition.length,
      );
    } else if (definition.type === 'bool') {
      if (definition.bit === undefined || definition.bit === null) {
        throw new BadRequestException(`Bit position is required for bool type: ${key}`);
      }
      return this.communication.readBit(
        deviceCode,
        definition.address,
        definition.bit,
      );
    } else {
      throw new BadRequestException(`Unknown type: ${definition.type}`);
    }
  }

  async writeValue(key: string, value: number[] | string | boolean): Promise<void> {
    const definition = await this.db.findDataPoint(key);
    if (!definition) {
      throw new BadRequestException(`Data point '${key}' not found`);
    }

    const deviceCode = this.getDeviceCode(definition.addressType);

    if (definition.type === 'number' && Array.isArray(value)) {
      await this.communication.writeNumbers(deviceCode, definition.address, value);
    } else if (definition.type === 'string' && typeof value === 'string') {
      await this.communication.writeString(
        deviceCode,
        definition.address,
        value,
        'ascii',
      );
    } else if (definition.type === 'bool' && typeof value === 'boolean') {
      if (definition.bit === undefined || definition.bit === null) {
        throw new BadRequestException(`Bit position is required for bool type: ${key}`);
      }
      await this.communication.writeBit(
        deviceCode,
        definition.address,
        definition.bit,
        value,
      );
    } else {
      throw new BadRequestException(`Type mismatch for data point '${key}'`);
    }

    // 쓰기 성공 후 캐시 업데이트
    await this.db.saveCache({
      key,
      value,
      timestamp: new Date(),
      error: undefined,
    });
  }

  async clearCache(): Promise<void> {
    await this.db.clearAllCache();
    this.logger.log('Cache cleared');
  }
}
