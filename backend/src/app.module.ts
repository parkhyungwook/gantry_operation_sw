import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlcModule } from "./plc/plc.module";
import { ProcessModule } from "./process/process.module";
import { DevicesModule } from "./devices/devices.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("PG_HOST", "localhost"),
        port: parseInt(configService.get<string>("PG_PORT", "5432"), 10),
        username: configService.get<string>("PG_USER", "postgres"),
        password: configService.get<string>("PG_PASSWORD", "dns_tool"),
        database: configService.get<string>("PG_DB", "gantry"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: true,
        logging: false,
      }),
    }),
    PlcModule,
    ProcessModule,
    DevicesModule,
  ],
})
export class AppModule {}
