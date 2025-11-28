import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DevicesController } from "./devices.controller";
import { DevicesService } from "./devices.service";
import { HardwareProfile } from "./entities/hardware-profile.entity";
import { Machine } from "./entities/machine.entity";
import { Stocker } from "./entities/stocker.entity";
import { Turnover } from "./entities/turnover.entity";
import { BufferUnit } from "./entities/buffer.entity";
import { Chute } from "./entities/chute.entity";

@Module({
  imports: [TypeOrmModule.forFeature([HardwareProfile, Machine, Stocker, Turnover, BufferUnit, Chute])],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
