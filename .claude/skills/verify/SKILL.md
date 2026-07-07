---
name: verify
description: 변경 검증 - lint 와 프로덕션 빌드를 돌리고 데모 데이터로 실제 화면 흐름을 확인한다. 코드 변경을 끝내기 전, 또는 "검증해줘" 요청 시 사용.
---

# 변경 검증 절차

1. `npm run lint` — 에러 0 이어야 함.
2. `npm run build` — 프로덕션 빌드 성공해야 함.
3. 런타임 확인 (UI 를 바꿨다면 필수):
   - `npm run start` (빌드 산출물) 또는 `npm run dev` 로 서버 실행
   - 관리 탭 → "데모 데이터 채우기" 로 샘플 데이터 주입
   - 바꾼 화면/흐름을 직접 조작해 확인 (Playwright 사용 가능:
     실행 파일 `/opt/pw-browsers/chromium`, 뷰포트 390x844 모바일 기준)
4. localStorage 스키마를 바꿨다면: 기존 저장 데이터가 있는 상태에서 새 코드가
   깨지지 않는지 확인 (`safeParse*` + `normalize*` 폴백 경로).

## 완료 기준

1~2 통과 + (UI 변경 시) 3에서 실제 동작 확인. 통과 전에는 작업 완료로 보고하지
않는다.
