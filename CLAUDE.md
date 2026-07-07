@AGENTS.md

# Clinic Tracker — Abbott CRM 영업사원 필드 앱

## What this app is

A **mobile-first, Korean-language field app for an Abbott CRM (Cardiac Rhythm
Management) sales representative**. "CRM" here means the **medical device
division** (pacemakers / ICDs / CRT devices) — not "Customer Relationship
Management". That said, the app itself functions as a lightweight CRM tool:
it manages relationships with physicians (교수님) across hospitals.

Today it covers:
- Daily **outpatient clinic schedule** (외래) per physician/hospital, split
  오전/오후
- **Visit tracking** (방문체크) + per-visit memos, with memo history
- **Events** (이벤트: 시술/컨퍼런스/미팅/기타) tied to a physician + date
- **Sales KPI** tracking for ICD / CRT-D / IPG / CRT-P / ICM — ASP, yearly
  target, monthly/yearly actuals, achievement %, revenue gap, "what would
  close the gap" calculator
- **Physician/hospital management** (외래 일정 등록/삭제)

Planned direction (see "Roadmap" at the bottom): extend the **시술
(procedure) event type** so logging an ICD / IPG / CRT-D / CRT-P / CSP
procedure also surfaces the **device/lead kit checklist** and **procedure
workflow** for that case — so the rep can prep consignment stock before a
case and log what was actually implanted.

## Tech stack & critical notes

- Next.js 16.2.6 (App Router, Turbopack-by-default), React 19.2, TypeScript
  5, Tailwind CSS v4, ESLint 9 flat config.
- **`@AGENTS.md` (imported above) is load-bearing**: Next.js 16 has real
  breaking changes vs. training-data assumptions — async
  `params`/`searchParams`/`cookies`/`headers`, `middleware` → `proxy`
  rename, `next lint` removed (use `eslint` directly, as `package.json`
  already does), Turbopack default, ESLint flat config, parallel-route
  `default.js` now required, etc. Check
  `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
  before touching routing, data fetching, or `next.config.ts`.
- The app is currently **100% client-side**: `app/page.tsx` starts with
  `"use client"`, it's the only route, there are no API/route handlers, no
  server components, no database. None of the async-Request-API breaking
  changes bite yet — but they will the instant a route handler, server
  component, or dynamic `[param]` route is introduced.

## Commands

- `npm run dev` — start dev server (Turbopack, outputs to `.next/dev`)
- `npm run build` — production build (Turbopack by default)
- `npm run start` — run production build
- `npm run lint` — ESLint via flat config (`eslint.config.mjs`)
- No test suite exists yet.

**완료 조건 (필수)**: 어떤 변경이든 끝내기 전에 `npm run lint` 와
`npm run build` 가 모두 통과해야 한다. 통과 전에는 작업 완료로 보고하지
말 것.

## Architecture

Everything lives in **`app/page.tsx`** (~2100 lines) as a single client
component. `app/layout.tsx` only sets metadata/viewport (title: "외래 방문
트래커") and imports global styles (`app/globals.css`, Tailwind v4 via
`@theme inline`).

### Persistence: `localStorage` only
There is no backend. All state is per-browser, keyed in `localStorage`:
- `professors` → `Professor[]`
- `visits` → `Visit[]`
- `events` → `Event[]`
- `kpiData` → `KpiData`

Reads go through `safeParseArray<T>` / `safeParseObject<T>` — defensive
`JSON.parse` that falls back to `[]` / `{}` on missing/invalid data. Writes
happen in `useEffect` hooks gated by a `hasLoadedStoredData` flag, so the
initial empty in-memory state never overwrites stored data before it's
loaded.

### Hydration-safe loading pattern
`today` and `calendarDate` start as `null` and are populated inside a
`requestAnimationFrame` callback in the mount `useEffect`. The component
renders a `"로딩 중..."` placeholder until both are set. **Keep this pattern**
for any new date-dependent or localStorage-dependent state — it's what
prevents SSR/CSR hydration mismatches (date-based UI literally cannot match
between server render time and client render time).

### Date handling
Always use the local `formatDateKey` (→ `YYYY-MM-DD`) and `parseDateKey`
helpers — **not** `toISOString()` or raw `Date` arithmetic — to avoid
timezone-shift bugs when comparing/keying calendar dates.

## Data model (current)

```ts
type Schedule = { day: string; period: string };  // day: 월~일, period: 오전/오후
type Professor = { id: number; name: string; hospital: string; schedules: Schedule[] };
type Visit = { professorId: number; period: string; date: string; memo: string };

type EventType = "시술" | "컨퍼런스" | "미팅" | "기타";
type Event = { id: number; date: string; professorId: number; eventType: EventType; memo: string };

type ProductName = "ICD" | "CRT-D" | "IPG" | "CRT-P" | "ICM";
type KpiProductData = { asp: number; yearly: number; actual: number };
type KpiData = {
  rate: number;                                     // USD -> KRW exchange rate
  HV_asp: number; LV_asp: number; ICM_asp: number;  // group-level ASP overrides
  products: Record<ProductName, KpiProductData>;
  hospitals: KpiHospitalData[];                     // persisted but currently unused in UI
};
```

Notes:
- `EVENT_PERIOD = "이벤트"` is a sentinel `period` value used to create a
  `Visit` record specifically for an `Event`, so event attendance reuses the
  same visit-memo machinery as clinic visits. `getEventVisit`,
  `toggleVisitForDate`, and `updateMemo` all branch on this constant —
  follow the same pattern for any new "non-clinic but visit-like" record
  type.
- **HV (High Voltage)** group = ICD + CRT-D (devices with a defibrillator
  capacitor). **LV (Low Voltage)** group = IPG + CRT-P (pacing-only). **ICM**
  is its own group. This HV/LV/ICM split is standard Abbott CRM sales
  terminology — preserve it when extending KPI logic.
- `KpiHospitalData = { id; name; products: Record<ProductName, number> }`
  exists in the type and is persisted, but isn't currently rendered —
  likely a removed/half-built per-hospital KPI breakdown (see commit "병원별
  KPI 삭제"). Don't delete it without checking whether it should be
  revived instead.

## UI / code conventions

- **Korean-first UI strings.** All labels, buttons, placeholders are Korean
  and follow a consistent voice (e.g. "방문체크", "방문완료", "메모 편집",
  "삭제", "저장", "취소"). Match this register for new UI text.
- Tailwind v4 utility classes, consistent visual language:
  - Outer cards: `rounded-3xl bg-white p-5 shadow-sm`
  - Nested cards / inputs: `rounded-2xl`
  - Status colors: green = 완료/달성 (done / on-target), red =
    미완료/부족 (pending / short), purple = 이벤트 (events), amber =
    80–99% achievement band, blue = primary actions
  - Bottom nav: fixed bar driven by the `navTabs` array, which also drives
    the `tab` switch in the JSX — add new tabs there.
- Mobile-first: `max-w-md` centered container, `pb-24` to clear the fixed
  bottom nav.
- Code is organized top-to-bottom by concern: types → constants/helpers →
  derived data (`useMemo`) → handlers (`addX`/`removeX`/`toggleX`/`updateX`)
  → render helpers (`renderXCard`) → JSX tree per tab.
- No comments except for non-obvious invariants (current file mostly follows
  this — keep it that way).
- No sub-components yet. If `page.tsx` grows much further, consider
  extracting `renderClinicCard` / `renderEventCard` / the calendar grid / the
  KPI section into `app/components/*.tsx` — but don't do this preemptively.

---

# Domain knowledge & roadmap

시술/키트 체크리스트/케이스 로깅 등 **시술 관련 기능을 만들 때는 먼저
`docs/abbott-domain.md` 를 읽을 것** — Abbott CRM 제품 분류(IPG/ICD/CRT-P/
CRT-D/ICM/CSP), 시술별 임플란트 키트 구성표, 시술 절차 흐름, 데이터 모델
확장안(`ProcedureDetail`), 로드맵이 정리되어 있다. (매 세션 로드할 필요가
없어 CLAUDE.md 에서 분리함)
