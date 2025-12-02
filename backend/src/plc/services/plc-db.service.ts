import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DataSet } from "../entities/data-set.entity";
import { Tag } from "../entities/tag.entity";
import { TagCache } from "../entities/tag-cache.entity";
import { DataSetCache } from "../entities/data-set-cache.entity";
import { PlcValue } from "../plc.types";

/**
 * DB 접근 전용 서비스
 */

@Injectable()
export class PlcDbService {
  constructor(
    @InjectRepository(DataSet)
    private readonly dataSetRepo: Repository<DataSet>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(TagCache)
    private readonly tagCacheRepo: Repository<TagCache>,
    @InjectRepository(DataSetCache)
    private readonly dataSetCacheRepo: Repository<DataSetCache>
  ) {}

  // ==================== DataSet CRUD ====================
  async createDataSet(dataSet: DataSet): Promise<DataSet> {
    return this.dataSetRepo.save(dataSet);
  }

  async findDataSet(id: number): Promise<DataSet | null> {
    return this.dataSetRepo.findOne({ where: { id }, relations: ["tags"] });
  }

  async findAllDataSets(): Promise<DataSet[]> {
    return this.dataSetRepo.find({ relations: ["tags"] });
  }

  async findEnabledDataSets(): Promise<DataSet[]> {
    return this.dataSetRepo.find({ where: { enabled: true }, relations: ["tags"] });
  }

  async updateDataSet(id: number, updates: Partial<DataSet>): Promise<void> {
    await this.dataSetRepo.update(id, updates);
  }

  async deleteDataSet(id: number): Promise<void> {
    await this.dataSetRepo.delete(id);
  }

  // ==================== Tag CRUD ====================
  async createTag(tag: Tag): Promise<Tag> {
    return this.tagRepo.save(tag);
  }

  async findTag(key: string): Promise<Tag | null> {
    return this.tagRepo.findOne({ where: { key }, relations: ["dataSet"] });
  }

  async findAllTags(): Promise<Tag[]> {
    return this.tagRepo.find({ relations: ["dataSet"] });
  }

  async findTagsByDataSet(dataSetId: number): Promise<Tag[]> {
    return this.tagRepo.find({ where: { dataSetId }, relations: ["dataSet"] });
  }

  async updateTag(key: string, updates: Partial<Tag>): Promise<void> {
    await this.tagRepo.update(key, updates);
  }

  async deleteTag(key: string): Promise<void> {
    await this.tagRepo.delete(key);
  }

  // ==================== TagCache CRUD ====================
  async saveTagCache(cache: { key: string; value: PlcValue; timestamp: Date; error?: string }): Promise<TagCache> {
    return this.tagCacheRepo.save(cache);
  }

  async saveTagCacheBulk(
    caches: Array<{ key: string; value: PlcValue; timestamp: Date; error?: string }>
  ): Promise<void> {
    if (caches.length === 0) {
      return;
    }
    await this.tagCacheRepo.upsert(caches, ["key"]);
  }

  async findTagCache(key: string): Promise<TagCache | null> {
    return this.tagCacheRepo.findOne({ where: { key } });
  }

  async findAllTagCache(): Promise<TagCache[]> {
    return this.tagCacheRepo.find();
  }

  async clearAllTagCache(): Promise<void> {
    await this.tagCacheRepo.clear();
  }

  // ==================== DataSet Cache CRUD ====================
  async findDataSetCache(): Promise<DataSetCache[]> {
    return this.dataSetCacheRepo.find();
  }

  async upsertDataSetCache(
    caches: Array<{ dataSetId: number; length: number; values: number[]; timestamp: Date; error?: string }>
  ): Promise<void> {
    if (caches.length === 0) {
      return;
    }
    await this.dataSetCacheRepo.upsert(caches, ["dataSetId"]);
  }
}
