---
name: docker
description: Container-based development for isolated, reproducible environments. Use when running npm commands, installing packages, executing code, or managing project dependencies. Trigger phrases include "npm install", "run the build", "start the server", "install package", or any code execution request.
---

# Docker Development Skill

Execute all package installations and code execution inside Docker containers. This keeps the host machine clean and ensures consistent environments across projects.

## Contexto deste projeto

Este repositório (`api.miyrah`, projeto Compose `miyrah-api`) já tem `docker-compose.yml` e `Dockerfile.dev` na raiz, com os serviços `postgres`, `minio`, `minio-init` e `dev` (perfil `dev`). Os blocos "Sample docker-compose.yml" / "Sample Dockerfile.dev" no final deste arquivo são só referência histórica do formato inicial — não precisam ser recriados.

> [!warning] Nome do projeto Compose é derivado do diretório
> O `docker-compose.yml` tem `name: miyrah-api` explícito. Se o diretório do projeto for renomeado de novo (ou esse `name:` mudar) sem migrar os dados, o Compose cria containers e volumes **novos e vazios** com o novo prefixo, deixando os antigos órfãos (parados, não removidos). Sintoma: API volta a dar erro de "table does not exist" mesmo com o container rodando — rode `npx prisma migrate deploy` no container novo antes de mais nada.

## Core Principle

**NEVER run `npm`, `node`, `npx`, or project scripts directly on the host machine.**

Instead, use `docker exec` or ensure the container is running the dev server.

## Pre-Flight Check (MANDATORY)

**Before running ANY npm/node command, Claude Code MUST verify the container is running.**

Run this check first:

```bash
docker ps --filter "name=miyrah-api" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Expected output:**
```
NAMES                       STATUS          PORTS
miyrah-api-dev-1       Up X minutes    0.0.0.0:3000->3000/tcp
```

**If container is NOT running:**
```bash
# Navigate to project root first
cd /home/ian/Documentos/MIYRAH/api.miyrah

# Start container
docker compose --profile  dev up dev -d

# Verify it started
docker ps --filter "name=miyrah-api"
```

**If container shows "Exited":**
```bash
# Check why it exited
docker logs miyrah-api-dev-1 --tail 20

# Remove and restart
docker compose --profile  dev down
docker compose --profile  dev up dev -d
```

## Quick Reference

### Check Container Status

```bash
# List running containers for current project
docker ps --filter "name=miyrah-api"

# Check container logs
docker logs miyrah-api-dev-1 --tail 50

# Check if dev server is responding
curl -s http://localhost:3000 > /dev/null && echo "Server running" || echo "Server not running"
```

### Start/Stop Containers

```bash
# Start development container (from project root)
docker compose --profile  dev up dev -d

# Stop container
docker compose --profile  dev down

# Restart container
docker compose --profile  dev restart dev

# Rebuild after Dockerfile changes
docker compose --profile  dev up dev -d --build
```

### Execute Commands Inside Container

```bash
# Install a package
docker exec -it miyrah-api-dev-1 npm install <package-name>

# Install dev dependency
docker exec -it miyrah-api-dev-1 npm install -D <package-name>

# Run unit tests
docker exec -it miyrah-api-dev-1 npm test

# Run e2e tests
docker exec -it miyrah-api-dev-1 npm run test:e2e

# Type-check without emitting (no dedicated "typecheck" script in this project)
docker exec -it miyrah-api-dev-1 npx tsc --noEmit -p tsconfig.build.json

# Run linting
docker exec -it miyrah-api-dev-1 npm run lint

# Run build
docker exec -it miyrah-api-dev-1 npm run build

# Open shell inside container
docker exec -it miyrah-api-dev-1 /bin/sh

# Run any arbitrary command
docker exec -it miyrah-api-dev-1 <command>
```

## When to Use Docker exec

| Operation | Use docker exec? | Reason |
|-----------|------------------|--------|
| `npm install` | ✅ Yes | Packages install in container |
| `npm run start:dev` | ❌ No | Already running via docker-compose |
| `npm test` / `npm run test:e2e` | ✅ Yes | Tests run in container environment |
| `npm run build` | ✅ Yes | Build happens in container |
| `npx prisma migrate dev` | ✅ Yes | Precisa do Node/deps do container e de rede até o Postgres do compose |
| `git` commands | ❌ No | Git runs on host (manages files) |
| File editing | ❌ No | Volume mount syncs automatically |

## Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  HOST (macOS/Linux/Windows)                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Docker Container (miyrah-api-dev-1)            │   │
│  │                                                     │   │
│  │  Node 24 Alpine                                     │   │
│  │  └── node_modules/ (container-only)                 │   │
│  │  └── Dev server (port 3000)                         │   │
│  │                                                     │   │
│  │  Volume Mounts:                                     │   │
│  │  └── .:/app (source code sync)                      │   │
│  │  └── node_modules:/app/node_modules (persist deps)  │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│                   Port 3000 mapped                          │
│                         │                                   │
│                         ▼                                   │
│              http://localhost:3000                          │
└─────────────────────────────────────────────────────────────┘
```

## Volume Mount Behavior

The `docker-compose.yml` mounts the project directory into the container:

```yaml
volumes:
  - .:/app                           # Source code (synced)
  - /app/node_modules                # Dependencies (container-only)
```

**What this means:**
- Source code changes on host are immediately visible in container
- `node_modules/` in container is separate from any on host
- Hot reload works automatically with `start:dev` (Nest CLI watch mode)

## Troubleshooting

### Container Not Running

```bash
# Check if container exists
docker ps -a --filter "name=miyrah-api"

# If exited, check why
docker logs miyrah-api-dev-1

# Restart
docker compose --profile  dev up dev -d
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000

# Kill the process or change PORT in .env / docker-compose.yml
```

### Module Not Found Errors

```bash
# Rebuild container with fresh dependencies
docker compose --profile  dev down
docker compose --profile  dev build --no-cache dev
docker compose --profile  dev up dev -d
```

### File Changes Not Reflecting

```bash
# Check volume mounts
docker inspect miyrah-api-dev-1 | grep -A 10 "Mounts"

# Restart container
docker compose --profile  dev restart dev
```

## Project Configuration

| Setting | Value |
|---------|---------------|
| Container name | `miyrah-api-dev-1` |
| Port | `3000` (fallback em `src/main.ts`; configurável via env `PORT`) |
| Port extra | `5555` (Prisma Studio) |
| Node version | `24` (Alpine) — conforme `@types/node` no `package.json` |
| Dev command | `npm run start:dev` |
| Outros serviços | `miyrah-api-postgres-1`, `miyrah-api-minio-1` |

### Environment Variables

Required env vars are loaded from `.env` file via docker-compose (ver lista completa em `CLAUDE.md`: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION_DEFAULT`, `JWT_EXPIRATION_REMEMBER_ME`, `RESEND_API_KEY`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `PORT`).

If a command needs a specific env var:
```bash
docker exec -it -e MY_VAR=value miyrah-api-dev-1 <command>
```

## Best Practices

1. **Always check container status** before running commands
2. **Use `docker exec`** for all npm/node operations
3. **Let volume mounts** handle file syncing (no manual copying)
4. **Rebuild image** after changing `package.json` or `Dockerfile`
5. **Check logs** if something isn't working

## Integration with Claude Code

When Claude Code needs to:

| Task | Action |
|------|--------|
| Install dependency | `docker exec -it miyrah-api-dev-1 npm install <pkg>` |
| Run unit tests | `docker exec -it miyrah-api-dev-1 npm test` |
| Run e2e tests | `docker exec -it miyrah-api-dev-1 npm run test:e2e` |
| Check types | `docker exec -it miyrah-api-dev-1 npx tsc --noEmit -p tsconfig.build.json` |
| Build project | `docker exec -it miyrah-api-dev-1 npm run build` |
| Start dev server | Container already runs it via docker-compose (`start:dev`) |
| Edit files | Edit directly (volume mount syncs) |
| Git operations | Run on host (not in container) |

## Sample docker-compose.yml (referência histórica)

Formato inicial usado antes de os serviços `postgres`/`minio` serem adicionados. O `docker-compose.yml` real na raiz do repo já é mais completo que isto — não usar este bloco como fonte da verdade:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped

  dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    env_file:
      - .env
    profiles:
      - dev
```

## Sample Dockerfile.dev

```dockerfile
FROM node:24-alpine

WORKDIR /app

# Install dependencies for native modules (ex.: Prisma engines)
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

ENV NODE_ENV=development

# Start development server (Nest CLI watch mode)
CMD ["npm", "run", "start:dev"]
```
