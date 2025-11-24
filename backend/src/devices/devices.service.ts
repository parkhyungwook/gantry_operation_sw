import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HardwareProfile } from "./entities/hardware-profile.entity";
import { Machine } from "./entities/machine.entity";
import { Stocker } from "./entities/stocker.entity";
import { Turnover } from "./entities/turnover.entity";
import { BufferUnit } from "./entities/buffer.entity";
import { Chute } from "./entities/chute.entity";
import { CreateHardwareProfileDto, UpdateHardwareProfileDto } from "./dto/hardware-profile.dto";

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(HardwareProfile) private readonly profileRepo: Repository<HardwareProfile>,
    @InjectRepository(Machine) private readonly machineRepo: Repository<Machine>,
    @InjectRepository(Stocker) private readonly stockerRepo: Repository<Stocker>,
    @InjectRepository(Turnover) private readonly turnoverRepo: Repository<Turnover>,
    @InjectRepository(BufferUnit) private readonly bufferRepo: Repository<BufferUnit>,
    @InjectRepository(Chute) private readonly chuteRepo: Repository<Chute>
  ) {}

  async createProfile(dto: CreateHardwareProfileDto): Promise<HardwareProfile> {
    if (dto.applied) {
      await this.profileRepo.createQueryBuilder().update(HardwareProfile).set({ applied: false }).execute();
    }

    const profile = this.profileRepo.create({
      glName: dto.glName,
      controller: dto.controller,
      host: dto.host,
      port: dto.port,
      series: dto.series,
      axes: dto.axes,
      applied: dto.applied ?? false,
    });
    const saved = await this.profileRepo.save(profile);

    await this.replaceChildren(saved.id, dto);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<HardwareProfile[]> {
    const profiles = await this.profileRepo.find({
      relations: ["machines", "stockers", "turnovers", "buffers", "chutes"],
      order: { id: "ASC" },
    });
    return profiles.map((p) => this.sortChildren(p));
  }

  async findOne(id: number): Promise<HardwareProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: ["machines", "stockers", "turnovers", "buffers", "chutes"],
    });
    if (!profile) {
      throw new NotFoundException(`Hardware profile ${id} not found`);
    }
    return this.sortChildren(profile);
  }

  async updateProfile(id: number, dto: UpdateHardwareProfileDto): Promise<HardwareProfile> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Hardware profile ${id} not found`);
    }

    if (dto.applied) {
      await this.profileRepo.createQueryBuilder().update(HardwareProfile).set({ applied: false }).execute();
    }

    if (dto.glName !== undefined) profile.glName = dto.glName;
    if (dto.controller !== undefined) profile.controller = dto.controller;
    if (dto.host !== undefined) profile.host = dto.host;
    if (dto.port !== undefined) profile.port = dto.port;
    if (dto.series !== undefined) profile.series = dto.series;
    if (dto.axes !== undefined) profile.axes = dto.axes;
    if (dto.applied !== undefined) profile.applied = dto.applied;

    await this.profileRepo.save(profile);

    if (
      dto.machines !== undefined ||
      dto.stockers !== undefined ||
      dto.turnovers !== undefined ||
      dto.buffers !== undefined ||
      dto.chutes !== undefined
    ) {
      await this.replaceChildren(id, dto);
    }

    return this.findOne(id);
  }

  async deleteProfile(id: number): Promise<void> {
    const exists = await this.profileRepo.findOne({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Hardware profile ${id} not found`);
    }
    await this.profileRepo.delete(id);
  }

  async applyProfile(id: number): Promise<HardwareProfile> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Hardware profile ${id} not found`);
    }
    await this.profileRepo.createQueryBuilder().update(HardwareProfile).set({ applied: false }).execute();
    profile.applied = true;
    await this.profileRepo.save(profile);
    return this.findOne(id);
  }

  private async replaceChildren(profileId: number, dto: Partial<CreateHardwareProfileDto>): Promise<void> {
    await this.machineRepo.delete({ profileId });
    await this.stockerRepo.delete({ profileId });
    await this.turnoverRepo.delete({ profileId });
    await this.bufferRepo.delete({ profileId });
    await this.chuteRepo.delete({ profileId });

    if (dto.machines?.length) {
      const machines = dto.machines.map((m) =>
        this.machineRepo.create({
          profileId,
          no: m.no,
          name: m.name,
          controller: m.controller,
          host: m.host,
          port: m.port,
          type: m.type,
        })
      );
      await this.machineRepo.save(machines);
    }

    if (dto.stockers?.length) {
      const stockers = dto.stockers.map((s) =>
        this.stockerRepo.create({
          profileId,
          no: s.no,
          name: s.name,
          type: s.type,
        })
      );
      await this.stockerRepo.save(stockers);
    }

    if (dto.turnovers?.length) {
      const turnovers = dto.turnovers.map((t) =>
        this.turnoverRepo.create({
          profileId,
          no: t.no,
          name: t.name,
          mode: t.mode,
          type: t.type,
        })
      );
      await this.turnoverRepo.save(turnovers);
    }

    if (dto.buffers?.length) {
      const buffers = dto.buffers.map((b) =>
        this.bufferRepo.create({
          profileId,
          no: b.no,
          name: b.name,
          exists: b.exists,
        })
      );
      await this.bufferRepo.save(buffers);
    }

    if (dto.chutes?.length) {
      const chutes = dto.chutes.map((c) =>
        this.chuteRepo.create({
          profileId,
          no: c.no,
          name: c.name,
          exists: c.exists,
        })
      );
      await this.chuteRepo.save(chutes);
    }
  }

  private sortChildren(profile: HardwareProfile): HardwareProfile {
    profile.machines = (profile.machines || []).sort((a, b) => a.no - b.no);
    profile.stockers = (profile.stockers || []).sort((a, b) => a.no - b.no);
    profile.turnovers = (profile.turnovers || []).sort((a, b) => a.no - b.no);
    profile.buffers = (profile.buffers || []).sort((a, b) => a.no - b.no);
    profile.chutes = (profile.chutes || []).sort((a, b) => a.no - b.no);
    return profile;
  }
}
