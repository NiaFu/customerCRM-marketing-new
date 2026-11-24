# CRM MVP implementation and acceptance

## Milestones
1. Foundation — backend, Postgres migration, authentication, Docker, React shell
2. Customers — create/edit/search, email/source/location, activities, phone uniqueness
3. Tags — create/list/remove/assign and filter customers
4. Pipeline — create deals, view board, advance stage and show follow-up date
5. SMS — one-at-a-time composer, preview-by-default, purpose/consent validation, API integration and auditable outcomes
6. Harden — tests, mobile layout, deployment, backups and security review

## Acceptance checklist
- [ ] Sign-in succeeds with env-defined administrator and rejects invalid credentials
- [ ] Adding an Australian 04... number stores E.164 +614...
- [ ] Duplicate phone numbers return a clear error
- [ ] Customer search and tag filter show expected records
- [ ] Customers can have multiple tags and activity notes
- [ ] Sales opportunities can be created and moved across stages
- [ ] SMS preview mode never calls ClickSend and clearly says PREVIEW
- [ ] Marketing SMS without affirmative consent is blocked
- [ ] A manually opted-out customer cannot be sent marketing SMS
- [ ] Idempotency request ID prevents accidental duplicate sends
- [ ] API secrets never appear in browser code, GitHub, or HTTP responses
- [ ] PostgreSQL survives docker compose restart

## Phase 2 (NOT in current MVP)
- CSV import/export with safe mapping and duplicate review
- Staff accounts/role-based access, audit log, recovery, multi-tenancy
- Webhook for delivery receipts, inbound SMS and automatic STOP opt-outs
- Automated/segmented campaigns and scheduling
- SMS pricing/segment estimation, AI-generated follow-ups, reporting
- Production security and privacy assessment, backup/restore drills

## Privacy
Repository is public; never store customer information here. Use fake data until you have written authorization to import any employer's customer records. For real use deploy behind HTTPS, use strong secrets, protect backups, obtain required consents, and implement retention/access policies.
