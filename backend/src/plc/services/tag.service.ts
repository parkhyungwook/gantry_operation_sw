import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException, NotFoundException, Inject } from "@nestjs/common";
import { DeviceCode, COMMUNICATION_SERVICE, CommunicationService } from "../../communication/communication.types";
import { PlcDbService } from "./plc-db.service";
import { DataSet } from "../entities/data-set.entity";
import { Tag } from "../entities/tag.entity";
import { PlcValue } from "../plc.types";

/**
 * Tag 기반 PLC 서비스
 * - DataSet 단위로 폴링하고, Tag 매핑을 통해 개별 값 제공
 */
@Injectable()
export class TagService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TagService.name);

  // DataSet별 폴링 타이머
  private pollingTimers: Map<number, NodeJS.Timeout> = new Map();
  // DataSet별 원본 데이터 캐시 (메모리)
  private dataSetCache: Map<number, number[]> = new Map();
  private isPollingActive = false;
  private tagListCache: Map<number, Tag[]> = new Map();
  private dataSetCacheMeta: Map<number, { timestamp: Date; error?: string }> = new Map();

  // 성능 메트릭
  private readCount = 0;
  private pollingStartTime: Date | null = null;

  constructor(
    @Inject(COMMUNICATION_SERVICE) private readonly communication: CommunicationService,
    private readonly db: PlcDbService
  ) {}

  async onModuleInit() {
    this.logger.log("Tag Service initialized");
    try {
      await this.communication.connect();
      this.logger.log("PLC connection established");
    } catch (error) {
      this.logger.error("Failed to connect to PLC", (error as Error).stack);
    }
  }

  async onModuleDestroy() {
    this.stopPolling();
    await this.communication.disconnect();
    this.logger.log("Tag Service destroyed");
  }

  // ==================== 폴링 제어 ====================

  async startPolling(): Promise<void> {
    if (this.isPollingActive) {
      this.logger.warn("Polling already active");
      return;
    }

    if (!this.communication.isConnectionActive()) {
      await this.communication.connect();
    }

    this.isPollingActive = true;
    this.readCount = 0;
    this.pollingStartTime = new Date();

    this.logger.log("Starting DataSet polling");

    // 활성화된 DataSet만 폴링
    const dataSets = await this.db.findEnabledDataSets();
    for (const dataSet of dataSets) {
      this.startPollingForDataSet(dataSet);
    }
  }

  stopPolling(): void {
    if (!this.isPollingActive) {
      return;
    }

    this.isPollingActive = false;
    this.readCount = 0;
    this.pollingStartTime = null;

    this.logger.log("Stopping all DataSet polling");

    for (const [dataSetId, timer] of this.pollingTimers) {
      clearInterval(timer);
    }
    this.pollingTimers.clear();
    this.dataSetCache.clear();
    this.dataSetCacheMeta.clear();
    this.dataSetCacheMeta.clear();
  }

  isPolling(): boolean {
    return this.isPollingActive;
  }

  /**
   * DataSet 폴링 시작
   */
  private startPollingForDataSet(dataSet: DataSet): void {
    this.stopPollingForDataSet(dataSet.id);

    this.logger.log(`Start polling DataSet: ${dataSet.name} (${dataSet.addressType}${dataSet.startAddress}~${dataSet.startAddress + dataSet.length - 1}) every ${dataSet.pollingInterval}ms`);

    const timer = setInterval(() => {
      this.pollDataSet(dataSet).catch((err) => {
        this.logger.error(`Unhandled error while polling DataSet ${dataSet.id}`, (err as Error).stack);
      });
    }, dataSet.pollingInterval);

    this.pollingTimers.set(dataSet.id, timer);

    // 즉시 한 번 실행
    this.pollDataSet(dataSet).catch((err) => {
      this.logger.error(`Initial poll failed for DataSet ${dataSet.id}`, (err as Error).stack);
    });
  }

  private stopPollingForDataSet(dataSetId: number): void {
    const timer = this.pollingTimers.get(dataSetId);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(dataSetId);
      this.dataSetCache.delete(dataSetId);
      this.logger.log(`Stopped polling DataSet: ${dataSetId}`);
    }
  }

  /**
   * DataSet 전체를 한 번에 읽고, 각 Tag별로 캐시 저장
   */
  private async pollDataSet(dataSet: DataSet): Promise<void> {
    const cachePayload: Array<{ key: string; value: PlcValue; timestamp: Date; error?: string }> = [];
    let rawData: number[] = [];
    try {
      const deviceCode = this.getDeviceCode(dataSet.addressType);

      // 전체 워드를 한 번에 읽기
      rawData = await this.communication.readNumbers(deviceCode, dataSet.startAddress, dataSet.length);

      this.readCount++;
      this.dataSetCache.set(dataSet.id, rawData);
      this.dataSetCacheMeta.set(dataSet.id, { timestamp: new Date(), error: undefined });

      // 각 Tag별로 값 추출 및 캐시 저장
      const tags = await this.getTagsForDataSet(dataSet);
      for (const tag of tags) {
        try {
          const value = this.extractTagValue(tag, rawData);
          cachePayload.push({
            key: tag.key,
            value,
            timestamp: new Date(),
            error: undefined,
          });
        } catch (error) {
          this.logger.error(`Failed to extract tag ${tag.key}`, (error as Error).stack);
          cachePayload.push({
            key: tag.key,
            value: this.getEmptyValueForType(tag.dataType),
            timestamp: new Date(),
            error: (error as Error).message,
          });
        }
      }

      await this.db.saveTagCacheBulk(cachePayload);
      await this.db.upsertDataSetCache([
        {
          dataSetId: dataSet.id,
          length: rawData.length,
          values: rawData,
          timestamp: new Date(),
          error: undefined,
        },
      ]);
    } catch (error) {
      this.logger.error(`Failed to poll DataSet ${dataSet.id}`, (error as Error).stack);

      // 에러 발생 시 모든 Tag를 에러 상태로 저장
      const tags = await this.getTagsForDataSet(dataSet);
      for (const tag of tags) {
        cachePayload.push({
          key: tag.key,
          value: this.getEmptyValueForType(tag.dataType),
          timestamp: new Date(),
          error: (error as Error).message,
        });
      }

      await this.db.saveTagCacheBulk(cachePayload);
      this.dataSetCacheMeta.set(dataSet.id, { timestamp: new Date(), error: (error as Error).message });
      await this.db.upsertDataSetCache([
        {
          dataSetId: dataSet.id,
          length: rawData.length || dataSet.length,
          values: rawData,
          timestamp: new Date(),
          error: (error as Error).message,
        },
      ]);
    }
  }

  private async getTagsForDataSet(dataSet: DataSet): Promise<Tag[]> {
    const cached = this.tagListCache.get(dataSet.id);
    if (cached && cached.length > 0) {
      return cached;
    }
    const tags = dataSet.tags && dataSet.tags.length > 0 ? dataSet.tags : await this.db.findTagsByDataSet(dataSet.id);
    this.tagListCache.set(dataSet.id, tags);
    return tags;
  }

  getDataSetCacheSnapshot(): Array<{
    dataSetId: number;
    length: number;
    values: number[];
    timestamp?: Date;
    error?: string;
  }> {
    const out: Array<{
      dataSetId: number;
      length: number;
      values: number[];
      timestamp?: Date;
      error?: string;
    }> = [];
    for (const [dataSetId, values] of this.dataSetCache.entries()) {
      const meta = this.dataSetCacheMeta.get(dataSetId);
      out.push({
        dataSetId,
        length: values.length,
        values,
        timestamp: meta?.timestamp,
        error: meta?.error,
      });
    }
    return out;
  }

  async writeDataSetValues(dataSetId: number, values: number[]): Promise<void> {
    const dataSet = await this.db.findDataSet(dataSetId);
    if (!dataSet) {
      throw new NotFoundException(`DataSet ${dataSetId} not found`);
    }
    if (!Array.isArray(values)) {
      throw new BadRequestException("values must be an array");
    }
    if (values.length === 0) {
      throw new BadRequestException("values array is empty");
    }
    if (values.length > dataSet.length) {
      throw new BadRequestException(`values length ${values.length} exceeds data set length ${dataSet.length}`);
    }

    const deviceCode = this.getDeviceCode(dataSet.addressType);
    await this.communication.writeNumbers(deviceCode, dataSet.startAddress, values);

    // 메모리/DB 캐시 업데이트
    this.dataSetCache.set(dataSetId, values);
    const now = new Date();
    this.dataSetCacheMeta.set(dataSetId, { timestamp: now, error: undefined });
    await this.db.upsertDataSetCache([
      {
        dataSetId,
        length: values.length,
        values,
        timestamp: now,
        error: undefined,
      },
    ]);
  }

  /**
   * Tag 정의에 따라 rawData에서 값을 추출
   */
  private extractTagValue(tag: Tag, rawData: number[]): PlcValue {
    const { offset, dataType, wordLength, bitPosition } = tag;

    switch (dataType) {
      case "int16": {
        if (offset >= rawData.length) {
          throw new Error(`Offset ${offset} out of range`);
        }
        // 16비트 부호 있는 정수
        const value = rawData[offset];
        return value > 32767 ? value - 65536 : value;
      }

      case "int32": {
        if (offset + 1 >= rawData.length) {
          throw new Error(`Offset ${offset} out of range for int32`);
        }
        // 32비트 부호 있는 정수 (2워드)
        const low = rawData[offset];
        const high = rawData[offset + 1];
        let value = (high << 16) | low;
        if (value > 2147483647) {
          value -= 4294967296;
        }
        return value;
      }

      case "real": {
        if (offset + 1 >= rawData.length) {
          throw new Error(`Offset ${offset} out of range for real`);
        }
        // IEEE 754 float (2워드)
        const low = rawData[offset];
        const high = rawData[offset + 1];
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt16LE(low, 0);
        buffer.writeUInt16LE(high, 2);
        return buffer.readFloatLE(0);
      }

      case "string": {
        const len = wordLength || 1;
        if (offset + len - 1 >= rawData.length) {
          throw new Error(`Offset ${offset} out of range for string`);
        }
        // ASCII 문자열 (각 워드에 2글자씩 저장)
        let str = "";
        for (let i = 0; i < len; i++) {
          const word = rawData[offset + i];
          const char1 = word & 0xff;
          const char2 = (word >> 8) & 0xff;
          if (char1 !== 0) str += String.fromCharCode(char1);
          if (char2 !== 0) str += String.fromCharCode(char2);
        }
        return str.trim();
      }

      case "bool": {
        if (offset >= rawData.length) {
          throw new Error(`Offset ${offset} out of range`);
        }
        if (bitPosition === undefined || bitPosition === null) {
          throw new Error(`Bit position required for bool type`);
        }
        const word = rawData[offset];
        return ((word >> bitPosition) & 1) === 1;
      }

      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * Tag에 값 쓰기
   */
  async writeTagValue(key: string, value: PlcValue): Promise<void> {
    const tag = await this.db.findTag(key);
    if (!tag) {
      throw new NotFoundException(`Tag '${key}' not found`);
    }

    const { dataSet, offset, dataType, bitPosition } = tag;
    if (!dataSet) {
      throw new BadRequestException(`Tag '${key}' has no associated DataSet`);
    }

    const deviceCode = this.getDeviceCode(dataSet.addressType);
    const absoluteAddress = dataSet.startAddress + offset;

    switch (dataType) {
      case "int16": {
        if (typeof value !== "number") {
          throw new BadRequestException(`Value must be number for int16`);
        }
        await this.communication.writeNumbers(deviceCode, absoluteAddress, [value]);
        break;
      }

      case "int32": {
        if (typeof value !== "number") {
          throw new BadRequestException(`Value must be number for int32`);
        }
        // 32비트를 2개 워드로 분할
        const low = value & 0xffff;
        const high = (value >> 16) & 0xffff;
        await this.communication.writeNumbers(deviceCode, absoluteAddress, [low, high]);
        break;
      }

      case "real": {
        if (typeof value !== "number") {
          throw new BadRequestException(`Value must be number for real`);
        }
        // IEEE 754 float를 2워드로 변환
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeFloatLE(value, 0);
        const low = buffer.readUInt16LE(0);
        const high = buffer.readUInt16LE(2);
        await this.communication.writeNumbers(deviceCode, absoluteAddress, [low, high]);
        break;
      }

      case "string": {
        if (typeof value !== "string") {
          throw new BadRequestException(`Value must be string`);
        }
        await this.communication.writeString(deviceCode, absoluteAddress, value, "ascii");
        break;
      }

      case "bool": {
        if (typeof value !== "boolean") {
          throw new BadRequestException(`Value must be boolean`);
        }
        if (bitPosition === undefined || bitPosition === null) {
          throw new BadRequestException(`Bit position required for bool type`);
        }
        await this.communication.writeBit(deviceCode, absoluteAddress, bitPosition, value);
        break;
      }

      default:
        throw new BadRequestException(`Unknown data type: ${dataType}`);
    }

    // 캐시 업데이트
    await this.db.saveTagCache({
      key,
      value,
      timestamp: new Date(),
      error: undefined,
    });

    this.logger.log(`Wrote value to tag '${key}': ${value}`);
  }

  // ==================== 성능 메트릭 ====================

  getPollingMetrics(): { readCount: number; readsPerSecond: number; elapsedSeconds: number } {
    if (!this.isPollingActive || !this.pollingStartTime) {
      return { readCount: 0, readsPerSecond: 0, elapsedSeconds: 0 };
    }

    const elapsedMs = Date.now() - this.pollingStartTime.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const readsPerSecond = elapsedSeconds > 0 ? Math.floor(this.readCount / elapsedSeconds) : 0;

    return {
      readCount: this.readCount,
      readsPerSecond,
      elapsedSeconds,
    };
  }

  // ==================== 유틸리티 ====================

  private getDeviceCode(addressType: string): DeviceCode {
    const map: Record<string, DeviceCode> = {
      D: DeviceCode.D,
      R: DeviceCode.R,
      M: DeviceCode.M,
      X: DeviceCode.X,
      Y: DeviceCode.Y,
    };
    const code = map[addressType.toUpperCase()];
    if (!code) {
      throw new BadRequestException(`Invalid address type: ${addressType}`);
    }
    return code;
  }

  private getEmptyValueForType(dataType: string): PlcValue {
    switch (dataType) {
      case "int16":
      case "int32":
      case "real":
        return 0;
      case "bool":
        return false;
      case "string":
      default:
        return "";
    }
  }
}
