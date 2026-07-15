import { mkdirSync, writeFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { buildSwaggerConfig } from '../config/swagger.config';

const OUTPUT_DIR = 'openapi';
const OUTPUT_FILE = `${OUTPUT_DIR}/openapi.json`;

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(document, null, 2));

  await app.close();

  console.log(`OpenAPI document escrito em ${OUTPUT_FILE}`);
}

void generate();
