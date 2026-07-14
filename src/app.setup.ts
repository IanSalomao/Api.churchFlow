import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';

/**
 * Configuração global compartilhada entre o bootstrap (main.ts) e os testes
 * e2e — garante que os testes rodam com o mesmo pipeline de produção.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
}
