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
