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
      forbidNonWhitelisted: false, // 임시로 false (Tag value는 any 타입이라 유연하게)
    })
  );

  app.enableCors();

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle("Gantry PLC API")
    .setDescription("Mitsubishi PLC MC Protocol 3E Binary 통신 - Tag 기반 폴링 API")
    .setVersion("2.0")
    .addTag("data-sets", "DataSet 관리 (PLC 읽기 블록 정의)")
    .addTag("tags", "Tag 정의 관리 (DataSet 내부 매핑)")
    .addTag("tag-values", "Tag 값 읽기/쓰기")
    .addTag("tag-polling", "Tag 폴링 제어")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger UI available at: http://localhost:${port}/api`);
}

bootstrap();
