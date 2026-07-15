import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Compartilhado entre o bootstrap (main.ts) e o script de geração de tipos
 * para o front-end (src/scripts/generate-openapi.ts) — o JSON exportado
 * precisa refletir exatamente o mesmo documento servido em /docs.
 */
export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Church Flow API')
    .setDescription('API de gestão financeira para igrejas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
}
