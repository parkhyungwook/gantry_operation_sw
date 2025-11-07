import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlcCommunicationService, PlcConfig } from './services/plc-communication.service';
import { PlcDbService } from './services/plc-db.service';
import { PlcService } from './services/plc.service';
import { PlcController } from './plc.controller';
import { DataPoint } from './entities/data-point.entity';
import { PlcCache } from './entities/plc-cache.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DataPoint, PlcCache]),
  ],
  controllers: [PlcController],
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
    PlcDbService,
    PlcService,
  ],
  exports: [PlcCommunicationService, PlcDbService, PlcService],
})
export class PlcModule {}
