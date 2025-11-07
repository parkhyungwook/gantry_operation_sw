import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { McProtocolService, PlcConfig } from './mc-protocol.service';
import { PlcPollingService } from './plc-polling.service';
import { PlcController } from './plc.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
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
      provide: McProtocolService,
      useFactory: (config: PlcConfig) => {
        return new McProtocolService(config);
      },
      inject: ['PLC_CONFIG'],
    },
    PlcPollingService,
  ],
  exports: [McProtocolService, PlcPollingService],
})
export class PlcModule {}
