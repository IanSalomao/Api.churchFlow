# CLAUDE.md

Este arquivo orienta o Claude Code ao trabalhar neste repositório — a **API do Church Flow (ChF)**.

## Natureza deste repositório

Backend em NestJS do Church Flow, um sistema de gestão financeira para igrejas (controle de entradas/saídas, membros, ministérios, categorias e relatórios). Este repo cuida só da API; não há front-end aqui.

> [!important] Fonte da verdade do produto
> A especificação funcional completa (requisitos, telas, regras de negócio, campos de formulário) vive em
> `/home/ian/Documentos/I'AM/PESSOAL/CHURCH_FLOW/Church_Flow.md`.
> Este CLAUDE.md **não repete** aquele conteúdo — ele documenta apenas decisões de arquitetura/engenharia da API. Sempre que uma dúvida for sobre comportamento de tela, campo ou regra de negócio, a resposta está lá, não aqui.

> [!note] Estado atual do código
> Itens 1–3 do roadmap implementados: Docker Compose (Postgres + MinIO + serviço `dev`), schema Prisma com migration init, fundações da aplicação (config Zod, envelope global de resposta/erro, prefixo `/v1`, Swagger em `/docs`, PrismaModule com extension de multi-tenancy via AsyncLocalStorage) e o módulo `auth` completo (cadastro, login, guard global `APP_GUARD`, recuperação de senha) com testes unitários e e2e. Os CRUDs de feature (members, ministries, categories, transactions), dashboard, relatórios e churches ainda não existem.
>
> Ambiente de dev roda em containers: todo `npm`/`npx` deve ser executado dentro do serviço `dev` (`docker exec church-flow-api-dev-1 ...`) — o `node_modules` do host não é usado.

## Stack

| Camada         | Tecnologia                                                   |
| -------------- | ------------------------------------------------------------- |
| Linguagem      | TypeScript                                                     |
| Framework      | NestJS                                                         |
| Banco de dados | PostgreSQL                                                     |
| ORM            | Prisma (Client + Migrate)                                     |
| Autenticação   | JWT (stateless, expiração variável — ver seção Autenticação)  |
| Validação      | class-validator + class-transformer (DTOs)                    |
| Env config     | `@nestjs/config` + validação de schema com Zod                |
| Docs de API    | `@nestjs/swagger`                                              |
| E-mail         | Resend (recuperação de senha)                                  |
| Geração de PDF | Puppeteer (relatórios)                                         |
| Storage        | Object storage S3-compatible (MinIO local / S3 ou R2 em prod) |
| Testes         | Jest (unit) + Supertest (e2e)                                  |

## Comandos

```bash
npm run start:dev      # servidor de dev com hot-reload
npm run start:debug    # servidor de dev com debugger + hot-reload
npm run build          # compila para dist/ (nest build)
npm run lint           # eslint --fix em src/, apps/, libs/, test/
npm run format         # prettier --write em src/ e test/

npm run test           # testes unitários (Jest; rootDir src/, pega todo *.spec.ts)
npm run test:watch     # unitários em watch mode
npm run test:cov       # unitários com relatório de cobertura
npm run test:e2e       # e2e via Supertest (test/*.e2e-spec.ts, config em test/jest-e2e.json)
```

Rodar um teste específico:

```bash
npx jest src/auth/auth.service.spec.ts        # um arquivo (unit)
npx jest -t "nome do describe ou it"          # por nome, em qualquer arquivo
npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts   # um arquivo e2e
```

## Arquitetura multi-tenant

Cada **igreja** é um tenant. É um schema único no Postgres — **não** há schema nem banco separado por igreja.

- Toda tabela que pertence a uma igreja (membros, ministérios, categorias, transações, relatórios) tem uma coluna `churchId`.
- O escopo por tenant é aplicado de forma centralizada via **Prisma Client Extension** (não confiar em cada service lembrar de filtrar por `churchId` manualmente) — a extension injeta o filtro/valor de `churchId` nas queries a partir do contexto da request autenticada.
- `Church` é ao mesmo tempo o tenant e a entidade de autenticação (ver abaixo) — não existe um modelo `User` separado no MVP, já que o cadastro/login é feito diretamente pela igreja (não há múltiplos usuários por igreja na spec atual).

## Autenticação

- JWT único (sem refresh token), emitido no login.
- Tempo de expiração varia conforme o checkbox "Lembrar-me" do login: sessão curta sem marcar, 30 dias marcando. Os dois valores de expiração devem ser configuráveis via env var, não hardcoded.
- Recuperação de senha: token de uso único, expiração curta (ex.: 1h), enviado por e-mail via Resend, conforme fluxo de 4 passos descrito no spec.

> [!note] Resolvido — revogação imediata na exclusão de conta
> O spec exige que a exclusão de conta desative o acesso **imediatamente**. Decisão implementada (2026-07-13): o `JwtAuthGuard` global confere no banco, a cada request autenticado, se a igreja segue ativa (`findFirst` por PK com `deletedAt: null`). Conta excluída → 401 na hora, mesmo com JWT criptograficamente válido por até 30 dias. Custo aceito: um SELECT por PK por request.

## Estrutura de módulos

Módulos organizados por feature (não por camada técnica):

```
prisma/          # schema.prisma + migrations (o código Nest fica em src/)
src/
  prisma/          # PrismaService + client extension de multi-tenancy + TenantContext
  auth/
  churches/        # perfil da igreja, cadastro, exclusão de conta
  members/
  ministries/
  categories/
  transactions/
  reports/
  dashboard/       # agregações de Início e Dashboard
  common/          # guards, decorators, filters, pipes compartilhados
```

Cada módulo de feature segue o padrão Nest: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

## Convenções de API

- **Paginação**: offset-based via query params `page` e `limit`.
- **Envelope de resposta para listagens**:
  ```json
  {
    "data": [ ... ],
    "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
  }
  ```
- **Validação**: todo endpoint recebe input via DTO com `class-validator`; `ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- **Documentação**: todo controller/DTO decorado para o Swagger (`@nestjs/swagger`), exposto em `/docs` (ou path equivalente a definir no `main.ts`).
- **Soft delete**: entidades com exclusão lógica (Membros, Ministérios, Categorias, Transações) usam coluna `deletedAt` (nullable). Queries de listagem sempre filtram `deletedAt: null` por padrão.
- Valor de transação é armazenado com sinal (positivo = Entrada, negativo = Saída), conforme regra de negócio do spec — validar no DTO/service que a categoria escolhida é do mesmo tipo da transação.

## Banco de dados / Prisma

- Migrations do Prisma versionadas no repo (`prisma/migrations/`).
- Nomes de modelo em PascalCase singular (`Church`, `Member`, `Ministry`, `Category`, `Transaction`, `Report`), seguindo a convenção padrão do Prisma.
- Todo modelo com tenant (exceto `Church`) tem `churchId` com índice, dado que toda query de listagem filtra por ele.

## Relatórios em PDF

- Geração via Puppeteer (renderiza um template HTML/CSS do resumo agregado e converte para PDF).
- PDF gerado é enviado para um bucket S3-compatible; o endpoint de download retorna uma URL assinada de curta duração (gerada sob demanda, não armazenada como link permanente).
- Em ambiente local, o bucket é servido por MinIO (a subir via Docker Compose, junto do Postgres).

## Testes

- Toda feature nova precisa de: testes unitários do service (regras de negócio) **e** teste e2e do fluxo do endpoint via Supertest.
- Testes unitários ficam junto do arquivo testado (`*.spec.ts`, dentro de `src/`, conforme já configurado no `jest` do `package.json`).
- Testes e2e ficam em `test/*.e2e-spec.ts`.

## Variáveis de ambiente

Validadas via schema Zod no bootstrap (falha rápido se faltar alguma). Lista inicial esperada:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRATION_DEFAULT` (sessão curta, sem "lembrar-me")
- `JWT_EXPIRATION_REMEMBER_ME` (30 dias)
- `RESEND_API_KEY`
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- `PORT`

## Convenção de commits

Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, ...).

## Roadmap imediato

1. ~~Docker Compose com Postgres local (+ MinIO para storage de relatórios)~~ ✅
2. ~~Inicializar Prisma, definir schema e primeira migration~~ ✅
3. ~~Módulo `auth` (cadastro, login, recuperação de senha)~~ ✅
4. CRUDs de `members`, `ministries`, `categories`, `transactions`
5. Agregações de `dashboard`/Início (cards, gráficos)
6. Geração de relatórios em PDF + storage
7. `churches` — perfil, alteração de senha, exclusão de conta
