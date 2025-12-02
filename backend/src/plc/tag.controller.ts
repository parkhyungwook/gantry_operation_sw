import { Controller, Get, Post, Delete, Put, Body, Param, HttpCode, HttpStatus, Logger, ParseIntPipe, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from "@nestjs/swagger";
import { PlcDbService } from "./services/plc-db.service";
import { TagService } from "./services/tag.service";
import { CreateDataSetDto, UpdateDataSetDto, DataSetResponseDto } from "./dto/data-set.dto";
import { CreateTagDto, UpdateTagDto, TagResponseDto, TagValueResponseDto, WriteTagValueDto } from "./dto/tag.dto";
import { DataSetValuesResponseDto, WriteDataSetValuesDto } from "./dto/data-set-value.dto";
import { DataSet } from "./entities/data-set.entity";
import { Tag } from "./entities/tag.entity";

@Controller("plc")
export class TagController {
  private readonly logger = new Logger(TagController.name);

  constructor(
    private readonly tagService: TagService,
    private readonly db: PlcDbService
  ) {}

  // ==================== DataSet API ====================

  @Get("data-sets")
  @ApiTags("data-sets")
  @ApiOperation({ summary: "DataSet 목록 조회" })
  @ApiResponse({ status: 200, type: [DataSetResponseDto] })
  async getAllDataSets(): Promise<DataSetResponseDto[]> {
    const dataSets = await this.db.findAllDataSets();
    return dataSets.map((ds) => this.toDataSetDto(ds));
  }

  // ==================== DataSet Values (bulk) ====================

  @Get("data-sets/values")
  @ApiTags("data-sets")
  @ApiOperation({ summary: "DataSet별 값 조회 (캐시)" })
  @ApiResponse({ status: 200, type: [DataSetValuesResponseDto] })
  async getDataSetValues(): Promise<DataSetValuesResponseDto[]> {
    // 우선 메모리 캐시 조회, 없으면 DB 캐시 조회
    const snapshots = this.tagService.getDataSetCacheSnapshot();
    if (snapshots.length > 0) {
      return snapshots.map((s) => ({
        dataSetId: s.dataSetId,
        length: s.length,
        values: s.values,
        timestamp: s.timestamp,
        error: s.error,
      }));
    }

    const persisted = await this.db.findDataSetCache();
    return persisted.map((c) => ({
      dataSetId: c.dataSetId,
      length: c.length,
      values: c.values,
      timestamp: c.timestamp,
      error: c.error,
    }));
  }

  @Get("data-sets/:id")
  @ApiTags("data-sets")
  @ApiOperation({ summary: "DataSet 상세 조회" })
  @ApiParam({ name: "id", description: "DataSet ID" })
  @ApiResponse({ status: 200, type: DataSetResponseDto })
  async getDataSet(@Param("id", ParseIntPipe) id: number): Promise<DataSetResponseDto> {
    const dataSet = await this.db.findDataSet(id);
    if (!dataSet) {
      throw new NotFoundException(`DataSet ${id} not found`);
    }
    return this.toDataSetDto(dataSet);
  }

  @Post("data-sets")
  @ApiTags("data-sets")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "DataSet 생성" })
  @ApiBody({ type: CreateDataSetDto })
  @ApiResponse({ status: 201, type: DataSetResponseDto })
  async createDataSet(@Body() dto: CreateDataSetDto): Promise<DataSetResponseDto> {
    const dataSet = new DataSet();
    dataSet.name = dto.name;
    dataSet.addressType = dto.addressType;
    dataSet.startAddress = dto.startAddress;
    dataSet.length = dto.length;
    dataSet.pollingInterval = dto.pollingInterval ?? 1000;
    dataSet.enabled = dto.enabled ?? true;

    const saved = await this.db.createDataSet(dataSet);
    this.logger.log(`Created DataSet: ${saved.name} (ID: ${saved.id})`);

    return this.toDataSetDto(saved);
  }

  @Put("data-sets/:id")
  @ApiTags("data-sets")
  @ApiOperation({ summary: "DataSet 수정" })
  @ApiParam({ name: "id", description: "DataSet ID" })
  @ApiBody({ type: UpdateDataSetDto })
  @ApiResponse({ status: 200 })
  async updateDataSet(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateDataSetDto): Promise<void> {
    const dataSet = await this.db.findDataSet(id);
    if (!dataSet) {
      throw new NotFoundException(`DataSet ${id} not found`);
    }

    await this.db.updateDataSet(id, dto);
    this.logger.log(`Updated DataSet: ${id}`);
  }

  @Delete("data-sets/:id")
  @ApiTags("data-sets")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "DataSet 삭제" })
  @ApiParam({ name: "id", description: "DataSet ID" })
  @ApiResponse({ status: 204 })
  async deleteDataSet(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.db.deleteDataSet(id);
    this.logger.log(`Deleted DataSet: ${id}`);
  }

  @Post("data-sets/values")
  @ApiTags("data-sets")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "DataSet 값 일괄 쓰기" })
  @ApiBody({ type: WriteDataSetValuesDto })
  @ApiResponse({ status: 200 })
  async writeDataSetValues(@Body() dto: WriteDataSetValuesDto): Promise<{ message: string }> {
    await this.tagService.writeDataSetValues(dto.dataSetId, dto.values);
    return { message: `Values written to DataSet ${dto.dataSetId}` };
  }

  // ==================== Tag API ====================

  @Get("tags")
  @ApiTags("tags")
  @ApiOperation({ summary: "Tag 목록 조회" })
  @ApiResponse({ status: 200, type: [TagResponseDto] })
  async getAllTags(): Promise<TagResponseDto[]> {
    const tags = await this.db.findAllTags();
    return tags.map((tag) => this.toTagDto(tag));
  }

  @Get("tags/:key")
  @ApiTags("tags")
  @ApiOperation({ summary: "Tag 정의 조회" })
  @ApiParam({ name: "key", description: "Tag key" })
  @ApiResponse({ status: 200, type: TagResponseDto })
  async getTag(@Param("key") key: string): Promise<TagResponseDto> {
    const tag = await this.db.findTag(key);
    if (!tag) {
      throw new NotFoundException(`Tag '${key}' not found`);
    }
    return this.toTagDto(tag);
  }

  @Post("tags")
  @ApiTags("tags")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tag 생성" })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201, type: TagResponseDto })
  async createTag(@Body() dto: CreateTagDto): Promise<TagResponseDto> {
    // DataSet 존재 확인
    const dataSet = await this.db.findDataSet(dto.dataSetId);
    if (!dataSet) {
      throw new NotFoundException(`DataSet ${dto.dataSetId} not found`);
    }

    const tag = new Tag();
    tag.key = dto.key;
    tag.description = dto.description;
    tag.dataSetId = dto.dataSetId;
    tag.offset = dto.offset;
    tag.dataType = dto.dataType;
    tag.wordLength = this.calculateWordLength(dto.dataType, dto.wordLength);
    tag.bitPosition = dto.bitPosition;

    const saved = await this.db.createTag(tag);
    this.logger.log(`Created Tag: ${saved.key}`);

    return this.toTagDto(saved);
  }

  @Put("tags/:key")
  @ApiTags("tags")
  @ApiOperation({ summary: "Tag 수정" })
  @ApiParam({ name: "key", description: "Tag key" })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200 })
  async updateTag(@Param("key") key: string, @Body() dto: UpdateTagDto): Promise<void> {
    const tag = await this.db.findTag(key);
    if (!tag) {
      throw new NotFoundException(`Tag '${key}' not found`);
    }

    await this.db.updateTag(key, dto);
    this.logger.log(`Updated Tag: ${key}`);
  }

  @Delete("tags/:key")
  @ApiTags("tags")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Tag 삭제" })
  @ApiParam({ name: "key", description: "Tag key" })
  @ApiResponse({ status: 204 })
  async deleteTag(@Param("key") key: string): Promise<void> {
    await this.db.deleteTag(key);
    this.logger.log(`Deleted Tag: ${key}`);
  }

  // ==================== Tag Value API (핵심!) ====================

  @Get("tags/:key/value")
  @ApiTags("tag-values")
  @ApiOperation({ summary: "Tag 값 읽기 (캐시에서)" })
  @ApiParam({ name: "key", description: "Tag key", example: "x_servo_position" })
  @ApiResponse({ status: 200, type: TagValueResponseDto })
  async getTagValue(@Param("key") key: string): Promise<TagValueResponseDto> {
    const cache = await this.db.findTagCache(key);
    if (!cache) {
      throw new NotFoundException(`Tag value for '${key}' not found. Make sure polling is running.`);
    }

    return {
      value: cache.value,
      timestamp: cache.timestamp,
      error: cache.error,
    };
  }

  @Post("tags/:key/value")
  @ApiTags("tag-values")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Tag 값 쓰기" })
  @ApiParam({ name: "key", description: "Tag key", example: "x_servo_position" })
  @ApiBody({ type: WriteTagValueDto })
  @ApiResponse({ status: 200 })
  async writeTagValue(@Param("key") key: string, @Body() dto: WriteTagValueDto): Promise<{ message: string }> {
    await this.tagService.writeTagValue(key, dto.value);
    return { message: `Value written to tag '${key}'` };
  }

  // ==================== Tag Polling Control ====================

  @Post("tags/polling/start")
  @ApiTags("tag-polling")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Tag 폴링 시작" })
  @ApiResponse({ status: 200 })
  async startTagPolling(): Promise<{ message: string }> {
    await this.tagService.startPolling();
    return { message: "Tag polling started" };
  }

  @Post("tags/polling/stop")
  @ApiTags("tag-polling")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Tag 폴링 중지" })
  @ApiResponse({ status: 200 })
  stopTagPolling(): { message: string } {
    this.tagService.stopPolling();
    return { message: "Tag polling stopped" };
  }

  // ==================== DataSet Polling Control (동일 로직 라우팅) ====================

  @Post("data-sets/polling/start")
  @ApiTags("data-sets")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "DataSet 폴링 시작" })
  @ApiResponse({ status: 200 })
  async startDataSetPolling(): Promise<{ message: string }> {
    await this.tagService.startPolling();
    return { message: "DataSet polling started" };
  }

  @Post("data-sets/polling/stop")
  @ApiTags("data-sets")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "DataSet 폴링 중지" })
  @ApiResponse({ status: 200 })
  stopDataSetPolling(): { message: string } {
    this.tagService.stopPolling();
    return { message: "DataSet polling stopped" };
  }

  @Get("tags/polling/status")
  @ApiTags("tag-polling")
  @ApiOperation({ summary: "Tag 폴링 상태 조회" })
  @ApiResponse({ status: 200 })
  async getTagPollingStatus(): Promise<{ isPolling: boolean; dataSetCount: number; tagCount: number }> {
    const dataSets = await this.db.findEnabledDataSets();
    const tags = await this.db.findAllTags();
    return {
      isPolling: this.tagService.isPolling(),
      dataSetCount: dataSets.length,
      tagCount: tags.length,
    };
  }

  @Get("tags/polling/metrics")
  @ApiTags("tag-polling")
  @ApiOperation({ summary: "Tag 폴링 성능 메트릭 조회" })
  @ApiResponse({ status: 200 })
  getTagPollingMetrics(): { readCount: number; readsPerSecond: number; elapsedSeconds: number } {
    return this.tagService.getPollingMetrics();
  }

  // ==================== Utility ====================

  private toDataSetDto(ds: DataSet): DataSetResponseDto {
    return {
      id: ds.id,
      name: ds.name,
      addressType: ds.addressType,
      startAddress: ds.startAddress,
      length: ds.length,
      pollingInterval: ds.pollingInterval,
      enabled: ds.enabled,
    };
  }

  private toTagDto(tag: Tag): TagResponseDto {
    return {
      key: tag.key,
      description: tag.description,
      dataSetId: tag.dataSetId,
      offset: tag.offset,
      dataType: tag.dataType,
      wordLength: tag.wordLength,
      bitPosition: tag.bitPosition,
    };
  }

  private calculateWordLength(dataType: string, providedLength?: number): number {
    if (dataType === "string") {
      return providedLength ?? 5; // 기본 5워드 (10글자)
    }
    if (dataType === "int32" || dataType === "real") {
      return 2;
    }
    return 1; // int16, bool
  }
}
