import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { MembersModule } from './members/members.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantContextMiddleware } from './prisma/tenant-context.middleware';
import { MinistriesModule } from './ministries/ministries.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    MembersModule,
    MinistriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Com o prefixo global, '{*splat}' vira '/v1/{*splat}' e NÃO casa a rota
    // raiz '/v1' — por isso o '/' extra (vira '/v1' e cobre a raiz).
    consumer.apply(TenantContextMiddleware).forRoutes('/', '{*splat}');
  }
}
