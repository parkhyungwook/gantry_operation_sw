import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlcCommunicationService, PlcConfig } from './services/plc-communication.service';
import { PlcDbService } from './services/plc-db.service';
import { TagService } from './services/tag.service';
import { TagController } from './tag.controller';
import { DataSet } from './entities/data-set.entity';
import { Tag } from './entities/tag.entity';
import { TagCache } from './entities/tag-cache.entity';
import { DataSetCache } from './entities/data-set-cache.entity';
import { COMMUNICATION_SERVICE } from '../communication/communication.types';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DataSet, Tag, TagCache, DataSetCache]),
  ],
  controllers: [TagController],
  providers: [
    {
      provide: 'PLC_CONFIG',
      useFactory: (configService: ConfigService): PlcConfig => ({
        host: configService.get<string>('PLC_HOST', '10.33.62.207'),
        port: configService.get<number>('PLC_PORT', 5001),
      }),
      inject: [ConfigService],
    },
    {
      provide: PlcCommunicationService,
      useFactory: (config: PlcConfig) => {
        return new PlcCommunicationService(config);
      },
      inject: ['PLC_CONFIG'],
    },
    {
      provide: COMMUNICATION_SERVICE,
      useExisting: PlcCommunicationService,
    },
    PlcDbService,
    TagService,
  ],
  exports: [COMMUNICATION_SERVICE, PlcDbService, TagService],
})
export class PlcModule {}
