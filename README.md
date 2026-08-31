# director-backend

Node.js 24, TypeScript, Fastify 5, PostgreSQL 17 + PostGIS 3.5, Drizzle ORM, Zod 기반 백엔드입니다.

## 로컬 실행

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:push
npm run dev
```

- Health: `GET http://localhost:3000/health`
- DB readiness: `GET http://localhost:3000/ready`

## Docker 실행

```bash
docker compose up --build
```

## 주요 명령어

```bash
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
npm run db:studio
```

## 데이터 모델

`sample/DIRECTOR ERD (standalone).html`을 기준으로 Drizzle 스키마와 마이그레이션을 관리합니다.
지리 데이터는 SRID 4326의 PostGIS `geography` 타입을 사용합니다.
