# Agents.md — Minthy Training Backend

Last updated: 2026-05-01
Workspace: `C:\Users\USUARIO\Documents\AuT_IA\Gym_App\update-minthy-trainingV1`
Scope: Backend/API only — Next.js App Router + TypeScript + Supabase + Vercel.

## 1) Purpose
This file is the compact operational guide for Codex/Chat when working in the backend workspace.
It is not a full handoff and must not become a changelog.
Use it to avoid wrong deploy targets, mixed workspaces, stale phase assumptions, unsafe DB changes, and broad refactors.

## 2) Current project reality
- Product: Minthy Training / IA_GYM, gym training platform with Athlete, Coach, and Admin roles.
- Fase 0: completed — architecture and database.
- Fase 1: completed — real backend in Next.js + Supabase.
- Fase 2: completed — mobile app structure in Expo/React Native.
- Fase 3: completed functionally — Athlete core modules implemented.
- Current front: QA closure for Athlete before starting Fase 4 Coach mobile panel.
- Next major phase after QA: Fase 4 — Coach mobile panel.
- Handoff v15 exists but is partially stale; current prompt + validated runtime evidence override old handoff status.

## 3) Repository boundary
Backend workspace:
`C:\Users\USUARIO\Documents\AuT_IA\Gym_App\update-minthy-trainingV1`

Mobile workspace:
`C:\Users\USUARIO\Documents\AuT_IA\Gym_App\minthy-mobile`

Rules:
- One prompt = one workspace.
- Backend tasks must not edit `minthy-mobile`.
- Mobile tasks must not edit backend unless explicitly instructed in a separate backend prompt.
- Never mix backend and mobile fixes in one commit.

## 4) Stack and production target
Backend stack:
- Next.js App Router
- TypeScript
- Supabase Auth / PostgreSQL / RLS / Storage / RPC
- Vercel production deploy

Valid backend production target:
- Vercel project: `minthy-training`
- Production URL: `https://minthy-training.vercel.app`

Forbidden for backend deploy:
- `minthy-gym`
- any frontend/web/mobile Vercel project not named `minthy-training`

Backend deploy rule:
- Deploy only when strictly required.
- Prefer Git push auto-deploy to Vercel.
- Always verify Vercel `READY` and production alias `CURRENT`.
- If Vercel shows staged/old/current mismatch, stop and report.

## 5) Supabase public context
Allowed public identifiers:
- Supabase project_id: `wwhginemtslpjolcfggx`
- Gym ID: `a1b2c3d4-0001-0001-0001-000000000001`
- Test athlete email: `test@minthy.com`
- Test athlete userId: `4c21af62-98c4-4eef-bcef-d2fb50994257`
- Test athlete nickname: `Malvis`

Do not place secrets in this file or in prompts:
- no service_role key
- no anon key unless explicitly required and already public in env docs
- no JWT
- no refresh token
- no access token
- no Authorization header value
- no passwords
- no Vercel token
- no Expo/EAS token

## 6) Core backend domains
Primary athlete/backend domains:
- auth/session/profile
- onboarding profile fields
- QR sessions
- workout_sessions / session_machines / workout_sets
- qr_sessions
- athlete_xp_totals
- global_rankings / regional_rankings
- achievements / user_achievements
- challenges / user_challenges
- routines / routine exercises / history
- tutorials and tutorial progress
- promotions / user_promotions
- payments / memberships
- body_weight_logs
- avatar Storage bucket

## 7) QR and scoring rules
QR is competitive and must remain the trusted training path.
QR identifies the machine/context, not the user.
User identity comes from authenticated session/JWT.

Scoring model:
- total_volume = sum(weight * reps)
- FP rewards relative progress, not only raw volume.
- FC2 rewards weekly consistency.
- session_xp must persist in `qr_sessions.session_xp`.
- global/regional rankings must use persisted QR metrics, not only response payloads.
- manual or non-QR paths must not silently enter competitive scoring.

DATA-04 hotfix context:
- Commit: `4b2af70`
- Message: `fix(qr): persist session xp before ranking recalculation`
- File: `app/api/client/qr-sessions/route.ts`
- Root issue fixed locally: API returned positive `session_xp`, but persisted `qr_sessions.session_xp` could remain zero.
- Current required closure unless already proven complete: confirm Vercel `READY/CURRENT` and production DATA-04 verification on `minthy-training.vercel.app`.

## 8) Current QA status
Fase 3 Athlete QA is the active gate before Fase 4.
QA plan platform: Android physical device.
Already completed before current QA front:
- Auth base flows mostly PASS.
- Onboarding base persistence PASS.
- Home base data and QR update previously PASS.

Backend-internal QA priority:
- DATA-01 profile persistence
- DATA-02 avatar Storage/profile avatar_url
- DATA-03 QR session persistence
- DATA-04 XP/ranking persistence after QR
- DATA-05 promotion redemption persistence
- DATA-06 body weight persistence
- SEC-01 RLS/authorization isolation
- SEC-03 no sensitive logs

Do not mark mobile/device-only tests as backend PASS.
Use statuses:
- PASS_TECH
- PASS_TECH_PROD
- FAIL
- BLOCKED_ENV
- NEEDS_DEVICE_CONFIRMATION

## 9) Security and Supabase MCP rules
Default DB behavior during SCAN: SELECT-only.
Any INSERT/UPDATE/DELETE requires explicit task need.
For write tests:
- use QA markers, e.g. `QA_CODEX_YYYYMMDD_HHMMSS`
- snapshot before modifying
- clean up QA records when safe
- never alter real athlete data without explicit instruction
- never use destructive SQL broadly
- never disable RLS casually
- never bypass RLS unless verifying server-owned backend behavior and reporting why

Security checks should include:
- cross-user access prevention
- role checks
- RLS behavior
- token handling
- sensitive logs
- Storage path ownership
- QR/ranking anti-fraud assumptions

## 10) Mandatory methodology
Always follow SCAN -> PATCH -> VERIFY -> DEPLOY only if necessary.

### SCAN
- inspect current files before editing
- identify exact routes, tables, and auth context
- report file paths and line numbers
- state scope and exclusions
- identify existing unrelated dirty files

### PATCH
- minimal change only
- no opportunistic refactor
- no schema change unless strictly required
- no UI change from backend tasks
- explain root cause before patching

### VERIFY
- run strongest reasonable commands
- report exact command output summary
- separate new errors from known unrelated errors
- verify API/DB behavior with evidence when relevant

### DEPLOY
- backend only
- only to Vercel project `minthy-training`
- verify `READY` and `CURRENT`
- run production-safe post-deploy check when the patch affects runtime behavior

## 11) Verification commands
Preferred backend commands:
- `npm.cmd run build`
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint` only if the script is valid for the current Next.js version

Known issues from recent QA context:
- `npm run lint` may be stale if it invokes deprecated `next lint` behavior.
- `npx tsc --noEmit` may fail with pre-existing unrelated errors:
  - `app/api/admin/settings/route.ts(215,68)`
  - `app/api/client/routines/history/route.ts(66,13)`
- Do not hide these errors; report whether they block the target task.

## 12) Commit rules
Before commit:
- run `git status`
- show intended diff
- exclude unrelated dirty files
- never commit `next-env.d.ts`
- never commit `tsconfig.tsbuildinfo`
- never commit `.env*` or secret files

Commit only files in scope.
Use precise commit messages.
Do not push if verification reveals target-file errors.

## 13) Tooling guidance
Useful tools/skills:
- Vercel: deploy verification, logs, READY/CURRENT confirmation.
- Supabase: SELECT/QA writes/RLS/Storage verification; treat as production-capable.
- Codex Security: scan auth, RLS, logs, secrets, attack paths.

All tool output must be summarized with evidence, not vague statements.

## 14) What this file must not contain
- no secrets
- no long changelog
- no obsolete task states
- no speculative roadmap
- no copied full handoff
- no user passwords
- no raw auth headers

## 15) Immediate next backend action
Unless already completed and evidenced:
1. Verify Vercel project `minthy-training` is `READY/CURRENT` for commit `4b2af70` or newer deployment containing it.
2. Run production-safe DATA-04 verification:
   - QR API response `session_xp > 0`
   - persisted `qr_sessions.session_xp > 0`
   - `global_rankings.global_score` numeric
   - `rank_position` valid
3. Then continue broader Athlete QA support before Fase 4.
