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

# Domain knowledge: Abbott CRM products & procedures

Reference material for building procedure-related features (kit checklists,
case logging, etc.). Abbott's CRM (Cardiac Rhythm Management) portfolio and
exact model/SKU names change over time and by market — **treat the
product/model names below as a starting framework for the rep to
correct/extend**, not a verified current catalog.

## Product categories (maps to `ProductName`)

| Code | Full name | What it treats | Leads involved |
|---|---|---|---|
| **IPG** | Implantable Pulse Generator (pacemaker) | Bradycardia (slow heart rate) | 1–3 pacing leads (RA, RV, ± LV) |
| **ICD** | Implantable Cardioverter-Defibrillator | Life-threatening ventricular arrhythmia | RA pacing lead (if dual-chamber) + RV **defibrillation** lead |
| **CRT-P** | Cardiac Resynchronization Therapy – Pacemaker | Heart failure with dyssynchrony, no defib indication | RA + RV pacing leads + **LV lead** (via coronary sinus) |
| **CRT-D** | Cardiac Resynchronization Therapy – Defibrillator | Heart failure + defib indication | RA pacing lead + RV defib lead + **LV lead** |
| **ICM** | Insertable/Implantable Cardiac Monitor (loop recorder) | Diagnostic — arrhythmia detection (syncope, AF workup) | None — subcutaneous injectable device, no leads |
| **CSP** | Conduction System Pacing (His-bundle / left bundle branch area pacing) | Alternative RV lead placement to preserve native conduction | Not a separate device category — a **lead placement technique** combinable with IPG/CRT-D/CRT-P |

> CSP is a *technique*, not a sibling product line — a CSP lead effectively
> replaces or supplements the conventional RV lead. When modeling "procedure
> type" for logging, treat CSP as an attribute/tag on an IPG/ICD/CRT case
> (e.g. `leadPlacement: "conventional" | "CSP-His" | "CSP-LBBAP"`), not as a
> 6th value alongside ICD/IPG/CRT-D/CRT-P/ICM.

## Implant kit components — what's needed per procedure

What a rep typically needs to confirm in consignment/trunk stock before a
case:

| Component | IPG | ICD | CRT-P | CRT-D | + CSP lead |
|---|---|---|---|---|---|
| Pulse generator (device) | ✅ single/dual-chamber IPG | ✅ single/dual-chamber ICD | ✅ CRT-P generator | ✅ CRT-D generator | (same generator as base type) |
| RA pacing lead | ✅ (dual-chamber) | ✅ (dual-chamber) | ✅ | ✅ | optional |
| RV lead | ✅ pacing lead | ✅ **defibrillation** lead | ✅ pacing lead | ✅ defibrillation lead | replaced/supplemented by CSP lead |
| LV lead (quadripolar, via coronary sinus) | — | — | ✅ | ✅ | — |
| CSP lead (lumenless, stylet-driven pacing lead) | optional | optional | optional | optional | ✅ |
| Standard introducer sheath set | ✅ | ✅ | ✅ | ✅ | ✅ |
| CS access tools: guiding catheter/sheath, guidewire, venogram balloon catheter | — | — | ✅ | ✅ | — |
| CSP delivery: deflectable sheath + multi-curve stylets | — | — | — | — | ✅ |
| Header torque wrench | ✅ | ✅ | ✅ | ✅ | ✅ |
| Programmer (e.g. Merlin PCS) + wand | ✅ | ✅ | ✅ | ✅ | ✅ |
| PSA (pacing system analyzer) for intra-op thresholds | ✅ | ✅ | ✅ | ✅ | ✅ |
| DFT test equipment (external defibrillator, defib pads) | — | optional | — | optional | depends on base device |
| General OR supplies: drape, suture, local anesthetic, electrocautery, sterile pouch | ✅ | ✅ | ✅ | ✅ | ✅ |

## General procedure flow (IPG / ICD / CRT-P / CRT-D ± CSP)

1. **Pre-op**: confirm indication & device/lead selection with physician,
   check consignment inventory against the kit table above, sterile field
   setup, local anesthesia ± sedation.
2. **Venous access**: subclavian/axillary/cephalic vein puncture →
   introducer sheath placement.
3. **Lead placement**:
   - RA lead → right atrial appendage / septum
   - RV lead → RV apex or septum — *or*, for CSP, a lumenless lead is
     advanced through a deflectable sheath to the His bundle area / left
     bundle branch area, with placement confirmed via EGM pacing morphology
   - (CRT only) LV lead → cannulate the coronary sinus with a guiding
     catheter/sheath, venogram to map branch veins, advance the quadripolar
     LV lead into the target branch
4. **Measurements**: sensing/pacing thresholds & impedance via
   PSA/programmer for every lead placed.
5. **DFT test** (ICD/CRT-D, if performed): induce VF, confirm successful
   defibrillation at the programmed energy.
6. **Pocket**: create subcutaneous pocket, connect leads to the device
   header, torque set screws, seat the device.
7. **Closure**: suture the pocket, apply dressing.
8. **Device programming**: set pacing mode (e.g. DDD/VVI/CRT-specific),
   rates, AV/VV delays, ICD detection zones, via programmer.
9. **Post-op**: chest X-ray (lead position / pneumothorax check), wound
   check, schedule follow-up programming visit.

## Why this matters for the app

The existing `EventType = "시술" | ...` is the natural hook: a "시술" event
already ties a physician + hospital + date + memo. A future "procedure
detail" extension could add this *optionally*, without breaking existing
stored data:

```ts
type ProcedureDetail = {
  productType: ProductName;            // ICD / IPG / CRT-D / CRT-P / ICM
  leadPlacement?: "conventional" | "CSP-His" | "CSP-LBBAP";
  itemsUsed?: { item: string; model?: string; serial?: string }[];
  isNewImplant: boolean;               // vs. generator change / lead revision / upgrade
};
```

...attached to an `Event` when `eventType === "시술"`. This would let the KPI
tab derive `actual` counts directly from logged procedures (instead of, or
alongside, the manual +/- buttons), and let the rep see "이 케이스엔 이런
키트가 필요합니다" before walking into a case.

## Roadmap ideas (not yet implemented)

- **Procedure kit checklist UI**: when creating a "시술" event, let the rep
  pick a `productType` (+ `leadPlacement`) and show the matching row of the
  kit table above as a checklist.
- **Case logging**: capture which device/lead models & serials were actually
  implanted, for consignment reconciliation and KPI `actual` auto-increment.
- **Per-hospital KPI breakdown**: `KpiHospitalData` already has the right
  shape for this; the UI was removed (commit "병원별 KPI 삭제") — revisit if
  it's needed again rather than re-deriving from scratch.
- **Multi-device sync**: `localStorage`-only persistence means data doesn't
  follow the rep across devices/browsers. If this becomes a real need, it's
  a significant architectural change (requires a backend) — and the point
  where the Next.js 16 async Request API / route handler notes in
  `@AGENTS.md` become directly relevant.
