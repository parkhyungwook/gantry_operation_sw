import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";
import {
  CreateHardwareProfileDto,
  UpdateHardwareProfileDto,
  HardwareProfileResponseDto,
  MachineResponseDto,
  StockerResponseDto,
  TurnoverResponseDto,
  BufferResponseDto,
  ChuteResponseDto,
} from "./dto/hardware-profile.dto";
import { HardwareProfile } from "./entities/hardware-profile.entity";

@Controller("hardware/profiles")
@ApiTags("hardware-profiles")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: "List hardware profiles" })
  @ApiResponse({ status: 200, type: [HardwareProfileResponseDto] })
  async listProfiles(): Promise<HardwareProfileResponseDto[]> {
    const profiles = await this.devicesService.findAll();
    return profiles.map((p) => this.toDto(p));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get hardware profile detail" })
  @ApiParam({ name: "id", description: "Profile ID" })
  @ApiResponse({ status: 200, type: HardwareProfileResponseDto })
  async getProfile(@Param("id", ParseIntPipe) id: number): Promise<HardwareProfileResponseDto> {
    const profile = await this.devicesService.findOne(id);
    return this.toDto(profile);
  }

  @Post()
  @ApiOperation({ summary: "Create hardware profile" })
  @ApiBody({ type: CreateHardwareProfileDto })
  @ApiResponse({ status: 201, type: HardwareProfileResponseDto })
  async createProfile(@Body() dto: CreateHardwareProfileDto): Promise<HardwareProfileResponseDto> {
    const profile = await this.devicesService.createProfile(dto);
    return this.toDto(profile);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update hardware profile (replaces children if provided)" })
  @ApiParam({ name: "id", description: "Profile ID" })
  @ApiBody({ type: UpdateHardwareProfileDto })
  @ApiResponse({ status: 200, type: HardwareProfileResponseDto })
  async updateProfile(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateHardwareProfileDto): Promise<HardwareProfileResponseDto> {
    const profile = await this.devicesService.updateProfile(id, dto);
    return this.toDto(profile);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete hardware profile" })
  @ApiParam({ name: "id", description: "Profile ID" })
  @ApiResponse({ status: 204 })
  async deleteProfile(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.devicesService.deleteProfile(id);
  }

  @Post(":id/apply")
  @ApiOperation({ summary: "Mark this profile as applied (others reset)" })
  @ApiParam({ name: "id", description: "Profile ID" })
  @ApiResponse({ status: 200, type: HardwareProfileResponseDto })
  async applyProfile(@Param("id", ParseIntPipe) id: number): Promise<HardwareProfileResponseDto> {
    const profile = await this.devicesService.applyProfile(id);
    return this.toDto(profile);
  }

  private toDto(profile: HardwareProfile): HardwareProfileResponseDto {
    return {
      id: profile.id,
      applied: profile.applied,
      glName: profile.glName,
      controller: profile.controller,
      host: profile.host,
      port: profile.port,
      series: profile.series,
      axes: profile.axes,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      machines: (profile.machines || []).map(
        (m): MachineResponseDto => ({
          id: m.id,
          no: m.no,
          name: m.name,
          controller: m.controller,
          host: m.host,
          port: m.port,
          type: m.type,
        })
      ),
      stockers: (profile.stockers || []).map(
        (s): StockerResponseDto => ({
          id: s.id,
          no: s.no,
          name: s.name,
          type: s.type,
        })
      ),
      turnovers: (profile.turnovers || []).map(
        (t): TurnoverResponseDto => ({
          id: t.id,
          no: t.no,
          name: t.name,
          mode: t.mode,
          type: t.type,
        })
      ),
      buffers: (profile.buffers || []).map(
        (b): BufferResponseDto => ({
          id: b.id,
          no: b.no,
          name: b.name,
          exists: b.exists,
        })
      ),
      chutes: (profile.chutes || []).map(
        (c): ChuteResponseDto => ({
          id: c.id,
          no: c.no,
          name: c.name,
          exists: c.exists,
        })
      ),
    };
  }
}
