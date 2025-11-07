import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  app.enableCors();

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle("Gantry PLC API")
    .setDescription("Mitsubishi PLC MC Protocol 3E Binary 통신 및 폴링 API")
    .setVersion("1.0")
    .addTag("data-points", "데이터 포인트 관리 (등록, 조회, 삭제)")
    .addTag("polling", "폴링 제어 (시작, 중지, 간격, 상태)")
    .addTag("data", "데이터 읽기/쓰기")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger UI available at: http://localhost:${port}/api`);
}

bootstrap();
