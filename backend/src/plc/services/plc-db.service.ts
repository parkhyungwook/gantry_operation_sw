import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DataPoint } from "../entities/data-point.entity";
import { PlcCache } from "../entities/plc-cache.entity";

/**
 * DB 접근 전용 서비스
 */

@Injectable()
export class PlcDbService {
  constructor(
    @InjectRepository(DataPoint)
    private readonly dataPointRepo: Repository<DataPoint>,
    @InjectRepository(PlcCache)
    private readonly cacheRepo: Repository<PlcCache>
  ) {}

  // ==================== DataPoint CRUD ====================
  async createDataPoint(dataPoint: DataPoint): Promise<DataPoint> {
    return this.dataPointRepo.save(dataPoint);
  }

  async findDataPoint(key: string): Promise<DataPoint | null> {
    return this.dataPointRepo.findOne({ where: { key } });
  }

  async findAllDataPoints(): Promise<DataPoint[]> {
    return this.dataPointRepo.find();
  }

  async deleteDataPoint(key: string): Promise<void> {
    await this.dataPointRepo.delete({ key });
  }

  // ==================== PlcCache CRUD ====================
  async saveCache(cache: { key: string; value: number[] | string | boolean; timestamp: Date; error?: string }): Promise<PlcCache> {
    return this.cacheRepo.save(cache);
  }

  async findCache(key: string): Promise<PlcCache | null> {
    return this.cacheRepo.findOne({ where: { key } });
  }

  async findAllCache(): Promise<PlcCache[]> {
    return this.cacheRepo.find();
  }

  async clearAllCache(): Promise<void> {
    await this.cacheRepo.clear();
  }
}
