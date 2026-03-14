# Agents.md — Minthy Training

Last updated: 2026-03-13
Owner-confirmed status through: Fase 2 -> Sub-fase 2.5 -> Tarea 6 closed.

## 1) Purpose of this file
This file is an operational context guide for Codex/Chat when working inside the Minthy Training repositories.
It is **not** the primary project handoff.

Use this file to understand:
- what the project is,
- which repository is being edited,
- which phase/task is active,
- which constraints are mandatory,
- how to work without inventing flows.

## 2) Document hierarchy (mandatory)
When there is any conflict, follow this priority order:

1. **Handoff_MinthyTraining_v9.docx** → source of truth for roadmap, functional scope, and phase/task status.
2. **Agents.md** → operational context for Codex/Chat.
3. **Current prompt** → task-specific execution constraints.

Do **not** let Agents.md override the handoff.
If Agents.md is stale, update it after the task is truly validated.

## 3) Project snapshot
Minthy Training is a gym/training platform with:
- a **web app / backend** in Next.js,
- a **mobile app** in Expo / React Native,
- Supabase as database/auth backend,
- role-based product logic for athlete, coach, and admin.

The mobile app consumes the real backend. It does **not** duplicate backend logic.

User-facing language must remain **Spanish**.
The athlete-facing UI must stay clean and product-oriented.
Do **not** expose internal technical identifiers to athletes unless explicitly required.

## 4) Repositories / workspace roots

### A) Web / backend repository
Workspace root:
`C:\Users\USUARIO\Documents\AuT_IA\Gym_App\update-minthy-trainingV1`

Use this repository for:
- Next.js app/router work,
- API routes,
- SSR/auth guards,
- Supabase server-side integration,
- web panels and web logic.

### B) Mobile repository
Workspace root:
`C:\Users\USUARIO\Documents\AuT_IA\Gym_App\minthy-mobile`

Use this repository for:
- Expo / React Native screens,
- expo-router routes,
- mobile UI,
- QR scanner flow,
- local mobile state,
- mobile integration with the real backend.

## 5) Core product rules
- Athlete flow must feel fast, clear, and production-oriented.
- Mobile UX is **mobile-first**, not a compressed copy of web cards.
- Keep a clean hierarchy, compact controls, and low friction.
- Do not redesign screens unless the task explicitly requires it.
- Do not invent new product flows, new backend behavior, or speculative features.

## 6) Current project status

### Fase 2 — Expo app
- Sub-fase 2.1: complete
- Sub-fase 2.2: complete
- Sub-fase 2.3: complete
- Sub-fase 2.4: complete
- Sub-fase 2.5: active

### Sub-fase 2.5 — QR Scanner Real
Confirmed status:
- Tarea 1: complete
- Tarea 2: complete
- Tarea 3: complete
- Tarea 4: complete
- Tarea 5: complete
- Tarea 6: complete
- Tarea 7: complete
- Tarea 8: pending

## 7) Sub-fase 2.5 current reality
The intended QR mobile flow is:

Open app → Máquinas → Escanear QR → resolve machine → open machine page → register 3–4 sets → finish session → XP modal.

### Already confirmed complete through Tarea 6
#### QR resolution
- The QR resolver endpoint issue was fixed in Vercel after adding the missing Supabase server credential and redeploying.
- The machine QR flow already resolves correctly and opens the machine page.

#### Mobile auth for machine detail
- The machine detail backend now accepts mobile auth via `Authorization: Bearer <jwt>` in addition to web cookie-based auth.
- The mobile machine page already loads real data.

#### Tarea 5 — Machine page mobile
Tarea 5 is considered closed based on owner-confirmed runtime validation.
The machine page already includes:
- machine name,
- muscle group information,
- local set registration with weight / reps / RPE,
- current local session,
- automatic rest timer after saving a set,
- rest lock during countdown,
- PR block,
- recent history,
- compact mobile-first layout.

Confirmed local timer/alarm refinements already working:
- selectable rest alert tones,
- tone preview without starting the timer,
- alert-mode selector with icons instead of letters,
- real rest-finished alert still works,
- silence still works.

### Important scope boundary
Tarea 5 was local/UI behavior only.
Tarea 6 already closed the real session + XP flow.
Block 3 kg/lb backend support is already implemented on the backend side.
Task 7 deep-link QR payload generation is already validated.
Current web/backend work is Task 8 fallback without camera using a non-competitive manual path.

## 8) Active task now: Task 8 - Fallback sin cámara
Functional scope:
- create a backend-only manual fallback path when camera/permissions are unavailable,
- persist manual sessions in `manual_training_sessions`, separate from competitive QR sessions,
- ensure manual sessions remain history-only with no XP, rankings, achievements, badges, or similar side effects,
- reuse the existing machine/exercise dataset without inventing new catalog content,
- avoid touching mobile, QR generation, or competitive QR backend logic.

### Task 8 must respect
- backend/web repo only,
- no mobile changes in this task,
- no changes to Task 6 session/XP logic,
- no changes to Task 7 QR/deep-link behavior,
- no changes to Block 3 kg/lb competitive persistence,
- no hidden bridge from manual sessions into competitive rewards or rankings.

### Current backend reality
- competitive QR sessions still write through `qr_sessions` and feed XP/rankings,
- manual fallback sessions must write through a separate non-competitive table/path,
- legacy manual writes through `workout_sessions` are not acceptable for the new fallback design,
- Task 8 backend work is not enough to close the task until the mobile fallback flow is runtime-validated.

## 9) Required working method
Always follow:

### SCAN
- inspect existing files first,
- identify real current behavior,
- state exact scope,
- confirm what must **not** be touched.

### PATCH
- apply the smallest correct change,
- stay within the task boundary,
- avoid opportunistic refactors,
- do not touch unrelated flows.

### VERIFY
- run technical checks,
- report exact files modified,
- describe manual validation steps,
- do not declare completion without runtime validation.

## 10) Mandatory prompt discipline for Codex/Chat
For every new task, especially in a new chat, the assistant must:
- read `Agents.md` first,
- use `Handoff_MinthyTraining_v9.docx` as source of truth,
- work on **one task at a time**,
- explicitly list files to inspect first,
- explicitly list what must not be changed,
- end with manual validation requirements.

Recommended instruction line for prompts:

`Read Agents.md first. Use Handoff_MinthyTraining_v9.docx as source of truth. Follow SCAN -> PATCH -> VERIFY only.`

## 11) Mobile coding rules that must remain in force
- Keep visible UI text in Spanish.
- Avoid unnecessary layout churn.
- Use compact and professional controls.
- Be careful with React Native input behavior.
- Preserve existing working flows unless the task explicitly requires modifying them.
- If a task is mobile-only, do not modify backend files.
- If a task depends on backend contract verification, inspect the web/backend repository before patching mobile assumptions.

## 12) Verification standard
A task is not truly closed just because TypeScript or lint pass.
A task is only considered closed when both are satisfied:
- code checks pass,
- runtime/manual validation confirms expected behavior.

Whenever applicable, require evidence such as:
- screenshots,
- short runtime confirmations,
- endpoint response validation,
- UX-state confirmation for success/error paths.

## 13) Known confirmed truths that must not be forgotten
- Mobile uses the real backend.
- QR resolution already works.
- Machine detail already works with Bearer auth.
- Tarea 5 is already validated and should not be reopened unless a regression appears.
- The backend now supports unit-aware qr session persistence with canonical kg normalization.
- Task 7 deep linking is already validated.
- Task 8 must keep manual sessions non-competitive and history-only.

## 14) When to update this file
Update `Agents.md` only when one of these happens:
- a task is fully validated and closed,
- the active task changes,
- a core flow changes,
- a critical incident is resolved and changes operational reality.

Do **not** update this file for every micro-patch.
Do **not** turn this file into a changelog.
Keep it concise, factual, and current.

## 15) What this file should never become
- not a full handoff replacement,
- not a long changelog,
- not a speculative roadmap,
- not a place for unverified assumptions,
- not a place for outdated task states.

## 16) Immediate next execution context
If working **right now**, assume:
- repository may be either web/backend or mobile, so verify workspace first,
- backend now accepts unit-aware QR session sets through `POST /api/client/qr-sessions`,
- admin-generated machine QR payloads should now target `minthytraining://machine/{machine.id}`,
- native external QR scan is already validated for Task 7,
- manual fallback backend work must use `manual_training_sessions` and never enter the competitive QR pipeline,
- next mobile work should consume the new `weight_unit` contract and the `history` payload returned by `GET /api/machines/[machineId]`,
- Tarea 5 and Tarea 6 should stay untouched unless Block 3 integration reveals a direct regression.



