import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataPoint } from './entities/data-point.entity';
import { PlcCache } from './entities/plc-cache.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'plc-data.sqlite',
      entities: [DataPoint, PlcCache],
      synchronize: true, // 개발 환경에서만 사용, 프로덕션에서는 migration 사용
      logging: false,
    }),
    TypeOrmModule.forFeature([DataPoint, PlcCache]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
