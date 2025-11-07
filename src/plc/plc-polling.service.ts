import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McProtocolService } from './mc-protocol.service';
import { DataPoint } from '../database/entities/data-point.entity';
import { PlcCache } from '../database/entities/plc-cache.entity';

@Injectable()
export class PlcPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlcPollingService.name);
  private pollingInterval: NodeJS.Timeout | null = null;
  private intervalMs = 1000; // 기본 1초 폴링

  constructor(
    private readonly mcProtocol: McProtocolService,
    @InjectRepository(DataPoint)
    private readonly dataPointRepo: Repository<DataPoint>,
    @InjectRepository(PlcCache)
    private readonly cacheRepo: Repository<PlcCache>,
  ) {}

  onModuleInit() {
    this.logger.log('PLC Polling Service initialized');
  }

  onModuleDestroy() {
    this.stopPolling();
    this.logger.log('PLC Polling Service destroyed');
  }

  async registerDataPoint(dataPoint: Omit<DataPoint, 'createdAt' | 'updatedAt'>): Promise<DataPoint> {
    const existing = await this.dataPointRepo.findOne({ where: { key: dataPoint.key } });

    if (existing) {
      // 업데이트
      await this.dataPointRepo.update({ key: dataPoint.key }, dataPoint);
      this.logger.log(`Updated data point: ${dataPoint.key}`);
    } else {
      // 새로 생성
      await this.dataPointRepo.save(dataPoint);
      this.logger.log(`Registered data point: ${dataPoint.key}`);
    }

    return this.dataPointRepo.findOne({ where: { key: dataPoint.key } })!;
  }

  async unregisterDataPoint(key: string): Promise<void> {
    await this.dataPointRepo.delete({ key });
    await this.cacheRepo.delete({ key });
    this.logger.log(`Unregistered data point: ${key}`);
  }

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

  private async poll(): Promise<void> {
    const dataPoints = await this.dataPointRepo.find();

    const promises = dataPoints.map(async (dataPoint) => {
      try {
        let value: number[] | string;

        if (dataPoint.type === 'number') {
          value = await this.mcProtocol.readNumbers(
            dataPoint.device,
            dataPoint.address,
            dataPoint.count,
          );
        } else {
          value = await this.mcProtocol.readString(
            dataPoint.device,
            dataPoint.address,
            dataPoint.encoding || 'ascii',
            dataPoint.maxChars || 32,
          );
        }

        // 캐시 업데이트
        await this.cacheRepo.save({
          key: dataPoint.key,
          value,
          timestamp: new Date(),
          error: undefined,
        });
      } catch (error) {
        this.logger.error(`Failed to poll ${dataPoint.key}`, error.stack);

        // 에러 정보 저장
        await this.cacheRepo.save({
          key: dataPoint.key,
          value: dataPoint.type === 'number' ? [] : '',
          timestamp: new Date(),
          error: error.message,
        });
      }
    });

    await Promise.allSettled(promises);
  }

  async getCache(): Promise<Record<string, PlcCache>> {
    const cacheItems = await this.cacheRepo.find();
    const result: Record<string, PlcCache> = {};

    for (const item of cacheItems) {
      result[item.key] = item;
    }

    return result;
  }

  async getCacheItem(key: string): Promise<PlcCache | null> {
    return this.cacheRepo.findOne({ where: { key } });
  }

  async getDataPoints(): Promise<DataPoint[]> {
    return this.dataPointRepo.find();
  }

  async getDataPoint(key: string): Promise<DataPoint | null> {
    return this.dataPointRepo.findOne({ where: { key } });
  }

  async clearCache(): Promise<void> {
    await this.cacheRepo.clear();
    this.logger.log('Cache cleared');
  }

  async readOnce(key: string): Promise<number[] | string> {
    const dataPoint = await this.dataPointRepo.findOne({ where: { key } });
    if (!dataPoint) {
      throw new Error(`Data point ${key} not registered`);
    }

    if (dataPoint.type === 'number') {
      return this.mcProtocol.readNumbers(
        dataPoint.device,
        dataPoint.address,
        dataPoint.count,
      );
    } else {
      return this.mcProtocol.readString(
        dataPoint.device,
        dataPoint.address,
        dataPoint.encoding || 'ascii',
        dataPoint.maxChars || 32,
      );
    }
  }

  async writeValue(key: string, value: number[] | string): Promise<void> {
    const dataPoint = await this.dataPointRepo.findOne({ where: { key } });
    if (!dataPoint) {
      throw new Error(`Data point ${key} not registered`);
    }

    if (dataPoint.type === 'number' && Array.isArray(value)) {
      await this.mcProtocol.writeNumbers(
        dataPoint.device,
        dataPoint.address,
        value,
      );
    } else if (dataPoint.type === 'string' && typeof value === 'string') {
      await this.mcProtocol.writeString(
        dataPoint.device,
        dataPoint.address,
        value,
        dataPoint.encoding || 'ascii',
      );
    } else {
      throw new Error(`Invalid value type for data point ${key}`);
    }

    // 쓰기 후 캐시 업데이트
    await this.cacheRepo.save({
      key,
      value,
      timestamp: new Date(),
      error: undefined,
    });
  }
}
