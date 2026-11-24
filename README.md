# CustomerCRM Marketing — MVP

A focused CRM for customer management, tags, sales pipeline and **operator-confirmed one-to-one SMS**. Built with Java 21, Spring Boot 3.5, PostgreSQL, React, TypeScript and Vite.

## Features
- Customer records with Australian mobile number normalization, search and duplicate phone protection
- Tags, assign/remove tags, customer notes and activity history
- Sales pipeline: New → Visited → Quoted → Follow-up → Won / Lost
- SMS composer with consent checks, request deduplication and stored audit trail
- Safe **preview mode** by default; ClickSend integration enabled only by explicit environment configuration
- Single-admin Basic Auth for MVP. No passwords, personal customer records or API keys are committed.

[中文启动与使用指南](docs/START_HERE_ZH.md) · [使用 Supabase 云数据库的中文指南](docs/SUPABASE_SETUP_ZH.md)

## Cloud database option — Supabase

For a separate Supabase PostgreSQL project, copy `.env.supabase.example` to `.env.supabase`, add the **Connect → Session pooler (5432)** credentials with `sslmode=require`, then run:

```bash
docker compose --env-file .env.supabase -f docker-compose.supabase.yml up --build
```

This launches only the web and API containers (no local database). See [中文 Supabase 配置指南](docs/SUPABASE_SETUP_ZH.md). Do not commit `.env.supabase` or use real client data without authorization and a security review.

## Quick start with Docker
1. Install Docker Desktop and Docker Compose.
2. Copy `.env.example` to `.env`. Set **strong and unique** `CRM_ADMIN_PASSWORD` and `DB_PASSWORD`.
3. Run `docker compose up --build`.
4. Visit **http://localhost:3000** and sign in with the credentials from `.env`.
5. Add a test customer and tags, create an opportunity, and preview a test SMS.

The frontend calls `/api` via Nginx. The backend is not exposed on the host. Local development uses HTTP; **use HTTPS, private network controls, backups and proper identity management before real customer data or internet deployment**.

## Development without Docker
Use Java 21 and Maven for `backend/`; Node.js 22+ for `frontend/`; PostgreSQL 16+.
- Start PostgreSQL and configure `DB_URL`, `DB_USER`, `DB_PASSWORD`, `CRM_ADMIN_USERNAME`, `CRM_ADMIN_PASSWORD`.
- `cd backend && mvn spring-boot:run`
- `cd frontend && npm install && npm run dev` (Vite proxies `/api` to http://localhost:8080).

## SMS
Default `SMS_MODE=preview`: tapping Send records a **PREVIEW** only, without contacting ClickSend.
For live SMS set `SMS_MODE=clicksend`, `CLICKSEND_USERNAME`, `CLICKSEND_API_KEY`, and an appropriately configured `SMS_FROM`. The backend requires a marketing-consent record for marketing messages and prevents marketing sends to opted-out contacts. This is not a complete compliance solution; review Australian Spam Act / Sender ID obligations before live marketing.

Provider acceptance/queueing **does not prove handset delivery**. Delivery receipts and inbound STOP automation are phase-2 items. Process opt-outs manually and immediately in this MVP.

## API summary
- `GET /api/me` — credential check
- `GET|POST /api/customers`, `GET|PUT /api/customers/{id}`
- `GET|POST /api/tags`, `DELETE /api/tags/{id}`
- `POST|DELETE /api/customers/{id}/tags/{tagId}`
- `GET|POST /api/customers/{id}/activities`
- `GET|POST /api/deals`, `PATCH /api/deals/{id}/stage`
- `GET /api/customers/{id}/sms`, `POST /api/sms/send`

See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for scope, test criteria and follow-on work.

## Security notes
This repo is public. Never commit `.env`, `application-local.yml`, production data dumps, or credentials. Credentials are kept in memory only on the frontend (sign-in required after reload). The MVP supports a single admin account only; team accounts, fine-grained permissions, inbound SMS and delivery receipt webhooks are not yet implemented.
