# SCAN A11 - Tutoriales (Paso 1.3.14)

Fecha de scan: 2026-02-25
Workspace: `C:\Users\USUARIO\Documents\AuT_IA\Gym_App\update-minthy-trainingV1`

## Comandos ejecutados y resultados clave

```bash
rg -n "tutorial" app components lib
```
Resultado clave: detecta `app/dashboard/tutorials/page.tsx`, `components/tutorials-view.tsx`, uso de `tutorialsSeen` en `lib/store.tsx` y `components/machine-panel.tsx`; detecta funciones Supabase de tutorial en `lib/supabase/queries/machines.ts`.

```bash
rg -n "Tutorial" app components lib
rg -n "safety" app components lib
```
Resultado clave: confirma módulo de tutoriales en dashboard, modal de tutorial en `machine-panel`, y contenido admin mock (`app/admin/content/page.tsx`, `lib/admin-data.ts`).

```bash
rg -n "useStore" components app
```
Resultado clave: `components/tutorials-view.tsx` y `components/machine-panel.tsx` consumen `tutorialsSeen` + `markTutorialSeen`.

```bash
rg -n "fetch\(" app components
```
Resultado clave: no hay `fetch()` en `app/dashboard/tutorials/page.tsx` ni en `components/tutorials-view.tsx`; sí hay fetch en `components/machine-panel.tsx` hacia `/api/machines/${machineId}`.

```bash
rg -n "/api/.+tutorial" -S app
```
Resultado: `NO_MATCHES: /api/.+tutorial in app`

```bash
rg -n "tutorial" lib/supabase/types/database.ts
```
Resultado: `NO_MATCHES: tutorial in lib/supabase/types/database.ts` (archivo vacío).

```bash
rg -n "machine_tutorials|user_tutorial_progress" app/api
```
Resultado: `NO_MATCHES: machine_tutorials/user_tutorial_progress in app/api`

```bash
rg -n "machine_tutorials|user_tutorial_progress|tutorial" supabase lib
```
Resultado clave: hay esquema + RLS + seed en `supabase/migrations/*` y `supabase/seed.sql`.

---

## 1. Scope & entrypoints (rutas/paginas/componentes)

Rutas App Router detectadas del módulo Tutoriales (athlete):
- `app/dashboard/tutorials/page.tsx` (entrypoint principal)
- `app/dashboard/machines/[machineId]/page.tsx` (entrypoint secundario: modal bloqueante de tutorial en el panel de máquina)

Componentes principales:
- `components/tutorials-view.tsx` (UI principal de listado/detalle de tutoriales)
- `components/machine-panel.tsx` (modal de tutorial “primera vez”, usa estado `tutorialsSeen`)

Soporte de navegación:
- `components/app-sidebar.tsx` -> link `"/dashboard/tutorials"`
- `components/mobile-nav.tsx` -> link `"/dashboard/tutorials"`

Contexto admin relacionado (no flujo athlete de A11):
- `app/admin/content/page.tsx`
- `lib/admin-data.ts` (`adminTutorials` mock)

## 2. Data sources actuales (mock/store/static) + paths

Fuente real actual del módulo Tutoriales (dashboard athlete):
- **Mock estático**: `components/tutorials-view.tsx` importa `tutorials` y `machines` desde `lib/mock-data.ts`.
- **Estado local global (Context, no Zustand)**: `tutorialsSeen` y `markTutorialSeen` desde `lib/store.tsx` vía `useStore()`.
- **Constantes locales**: `commonErrors` en `components/tutorials-view.tsx`.

Observaciones de implementación:
- `lib/store.tsx` inicializa `tutorialsSeen` con `{}` en memoria; no persistencia en DB ni `localStorage`.
- `lib/store.tsx` importa `tutorials as initialTutorials` pero no se utiliza en el estado/acciones.
- `components/machine-panel.tsx` también marca tutorial visto (`markTutorialSeen(machineId)`), pero su contenido tutorial es estático embebido en el componente.

Conclusión: hoy Tutoriales en dashboard **no consume API**; depende de mock + store en memoria.

## 3. Contrato UI (campos exactos y comportamientos)

### 3.1 Campos de datos leídos por `components/tutorials-view.tsx`

De `machines` (`lib/mock-data.ts`):
- `id: string`
- `name: string`
- `muscles: string[]`
- (en mock existe `category`, `image`, pero esta vista no los usa para render principal)

De `tutorials` (`lib/mock-data.ts`):
- `machineId: string`
- `machineName: string` (no se usa visualmente en esta vista)
- `steps: string[]`
- `safetyTips: string[]`

De store (`lib/store.tsx`):
- `tutorialsSeen: Record<string, boolean>`
- `markTutorialSeen(machineId: string): void`

De constante local:
- `commonErrors: Record<string, string[]>` indexado por `machineId`.

### 3.2 Estados y comportamiento UI

`components/tutorials-view.tsx`:
- Estado `searchQuery` (filtra por `machine.name` y por cada `machine.muscles[]`).
- Estado `selectedMachine`:
  - `null` => vista lista.
  - string => vista detalle.
- `selectedTutorial = tutorials.find(t.machineId === selectedMachine)`.
- `seenCount = cantidad de keys en tutorialsSeen con valor true`.
- Badge por máquina y en detalle: `Visto` / `Pendiente`.
- Botón `Marcar como visto` visible solo si `!isSeen`.
- Contador principal: `{seenCount} de {machines.length} tutoriales vistos`.

Estados faltantes en este módulo:
- **No loading**.
- **No error**.
- **No empty state explícito** cuando búsqueda retorna 0 resultados.
- Video es placeholder (`"Video tutorial (demo)"`), no usa `video_url`.

`components/machine-panel.tsx` (acoplado):
- Bloquea registro de sets mientras `!isTutorialSeen`.
- Modal tutorial con pasos/seguridad hardcodeados (no DB/API).
- Sí maneja `loading/error/empty` para la máquina vía `/api/machines/[machineId]`, pero no para tutorial DB.

### 3.3 Filtros y conteos

Filtros actuales:
- Búsqueda por texto en nombre de máquina y músculos.
- No hay filtro por categoría explícito en UI Tutoriales.

Conteos:
- `seenCount` basado en `Record<machineId, boolean>`.
- Estado pendiente/visto por máquina.

### 3.4 Transformaciones de naming

En Tutoriales dashboard actual:
- No hay transformación `snake_case -> camelCase`, porque viene de mock camelCase.

En flujo de máquina API (otro componente):
- `components/machine-panel.tsx` usa campos snake_case (`muscle_groups`, etc.) directamente.

## 4. Estado de API (existente / inexistente)

No existen endpoints API dedicados a tutoriales:
- Sin rutas `app/api/**tutorial**`.
- Sin uso de `machine_tutorials` / `user_tutorial_progress` en `app/api`.

Endpoints relacionados existentes:
- `app/api/machines/catalog/route.ts` -> devuelve catálogo de máquinas (sin tutoriales).
- `app/api/machines/[machineId]/route.ts` -> devuelve detalle de máquina (sin tutoriales).

Código Supabase no cableado:
- `lib/supabase/queries/machines.ts` define:
  - `getTutorialsByMachine(machineId)`
  - `getTutorialProgress(userId)`
  - `updateTutorialProgress(userId, tutorialId, progressPercent)`
- Estas funciones no se usan desde rutas `app/api` ni desde la UI Tutoriales actual.

## 5. Estado DB (tablas/types existentes / inexistentes) + implicaciones

### 5.1 Tipos Supabase en código TS

- `lib/supabase/types/database.ts` está **vacío (0 bytes)**.
- En ese archivo no hay contrato tipado de `machine_tutorials` ni `user_tutorial_progress`.
- Implicación: cualquier migración/consumo queda sin type-safety real en TS.

### 5.2 Esquema SQL real (migrations)

Sí existen tablas tutoriales en SQL:
- `machine_tutorials` (`supabase/migrations/00002_schema_machines.sql`)
  - columnas: `id`, `machine_id`, `title`, `content`, `video_url`, `difficulty_level`, `duration_minutes`, `steps (jsonb)`, `order_index`, `is_active`, `created_at`.
- `user_tutorial_progress` (`supabase/migrations/00002_schema_machines.sql`)
  - columnas: `id`, `profile_id`, `tutorial_id`, `completed`, `progress_percent`, `completed_at`, `created_at`.
  - unique: `(profile_id, tutorial_id)`.

Relaciones evidentes:
- `machine_tutorials.machine_id -> machines.id`
- `user_tutorial_progress.tutorial_id -> machine_tutorials.id`
- `user_tutorial_progress.profile_id -> profiles.id`

Implicación funcional:
- DB soporta múltiples tutoriales por máquina (`order_index`), mientras UI actual asume 1 tutorial por máquina.

## 6. Gaps para migración (qué falta: API, SQL, RLS, seed)

Faltantes principales:
- Falta API pública interna (`app/api/...`) para listar tutoriales y progreso del usuario.
- Falta integrar `components/tutorials-view.tsx` con fetch real.
- Falta persistir `seen` en `user_tutorial_progress` (hoy solo memoria).
- Falta contrato tipado Supabase (`lib/supabase/types/database.ts` vacío).
- Falta unificar IDs: mock usa IDs tipo `SMITH-01`; DB usa UUID.
- Falta mapear campos DB -> contrato UI (`steps jsonb`, `video_url`, posible `safetyTips`).
- Falta definir fuente para `safetyTips/commonErrors` en DB (no columnas directas, hoy hardcoded/mock).

## 7. Propuesta mínima de endpoints (solo lista + payload esperado)

Propuesta mínima basada en UI real:

1. `GET /api/tutorials`
- Objetivo: lista para pantalla principal.
- Query opcional: `machineId`, `q`.
- Respuesta propuesta:
  - `machines`: `[{ id, name, muscles, category? }]`
  - `tutorials`: `[{ id, machineId, title, steps: string[], safetyTips: string[], videoUrl?: string, orderIndex, isActive }]`
  - `progress`: `Record<machineId, { seen: boolean, progressPercent: number, tutorialId?: string }>`

2. `GET /api/tutorials/[machineId]`
- Objetivo: detalle por máquina.
- Respuesta propuesta:
  - `{ machine: { id, name, muscles }, tutorial: { id, machineId, title, steps, safetyTips, commonErrors?: string[], videoUrl?, durationMinutes? }, progress: { seen, progressPercent } }`

3. `POST /api/tutorials/progress`
- Objetivo: marcar visto / actualizar progreso.
- Request:
  - `{ tutorialId: string, progressPercent: number }`
- Response:
  - `{ ok: true, progress: { tutorialId, completed, progressPercent, completedAt } }`

4. `GET /api/tutorials/progress`
- Objetivo: hidratar badges y contador en el listado.
- Response:
  - `{ progress: [{ tutorialId, machineId, completed, progressPercent, completedAt }] }`

Nota de diseño: mantener `tutorialId` como entidad primaria (por DB) y exponer también `machineId` para compatibilidad con UI actual.

## 8. Riesgos / trampas

- `lib/supabase/types/database.ts` vacío: alto riesgo de regresiones silenciosas por falta de tipos.
- `tutorialsSeen` en memoria: se pierde al recargar/abrir nueva sesión.
- Acoplamiento fuerte a mock:
  - `components/tutorials-view.tsx` usa `lib/mock-data.ts`.
  - `components/machine-panel.tsx` tiene tutorial hardcodeado.
- Duplicidad de fuentes de verdad para tutoriales (mock dashboard vs modal hardcodeado vs tablas SQL existentes).
- Inconsistencia de IDs:
  - mock (`SMITH-01`) vs DB (`UUID`) puede romper sincronía de “visto/no visto”.
- Contador usa `machines.length` mock; si DB devuelve otro universo, métrica quedará incorrecta.
- `commonErrors` estático indexado por IDs mock; al migrar a UUID, caerá a fallback genérico si no se adapta.
- RLS en `machine_tutorials` solo tiene política SELECT; para admin CRUD se requerirán políticas adicionales.
- Seed incompleto para tutoriales: solo 2 máquinas con tutorial en `seed.sql`; no hay seed para `user_tutorial_progress`.

## 9. Checklist de PATCH (siguiente paso)

1. Generar/actualizar tipos en `lib/supabase/types/database.ts` con tablas `machine_tutorials` y `user_tutorial_progress`.
2. Implementar endpoints `app/api/tutorials` + `app/api/tutorials/[machineId]` + `app/api/tutorials/progress`.
3. Cablear `components/tutorials-view.tsx` a fetch real y estados `loading/error/empty`.
4. Reemplazar `tutorialsSeen` local por estado derivado de API (o mantener cache local sincronizada).
5. Definir mapping de `steps` (`jsonb`) y resolver `safetyTips/commonErrors` (DB o fallback controlado).
6. Ajustar `components/machine-panel.tsx` para consumir tutorial real por máquina (evitar hardcode duplicado).
7. Normalizar IDs de máquina/tutorial en todo el flujo (UUID como canonical).
8. Completar seed de tutoriales para todas las máquinas relevantes y seed de progreso de usuario de prueba.
9. Revisar/ajustar RLS para operaciones de escritura requeridas por panel admin (si aplica).

---

## NEXT: PATCH

### Endpoints a implementar
- `GET /api/tutorials`
- `GET /api/tutorials/[machineId]`
- `GET /api/tutorials/progress`
- `POST /api/tutorials/progress`

### Archivos exactos a editar en el PATCH

Existentes:
- `components/tutorials-view.tsx`
- `components/machine-panel.tsx`
- `lib/store.tsx`
- `lib/supabase/queries/machines.ts`
- `lib/supabase/types/database.ts`

Nuevos (a crear en PATCH):
- `app/api/tutorials/route.ts`
- `app/api/tutorials/[machineId]/route.ts`
- `app/api/tutorials/progress/route.ts`

Opcionales según decisión de modelo:
- `supabase/migrations/00009_schema_tutorials_content.sql` (si se agregan campos para `safetyTips/commonErrors`)
- `supabase/seed.sql` (ampliar tutoriales + progreso de usuario de prueba)
