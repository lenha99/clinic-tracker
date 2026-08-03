/**
 * 둘러보기용 예시 데이터.
 *
 * 이 앱은 서버 없이 기기 안에서만 동작하기 때문에, 처음 열면 화면이 비어 있습니다.
 * 앱이 실제로 어떻게 쓰이는지 보려면 데이터가 필요하므로, 한 번의 클릭으로 채워
 * 넣을 수 있는 예시 세트를 둡니다.
 *
 * 등장하는 병원·교수는 전부 가상입니다. 실제 거래처 정보는 들어 있지 않습니다.
 * 날짜는 오늘을 기준으로 계산되므로, 언제 열어도 "이번 주" 화면이 채워집니다.
 */

type Schedule = { day: string; period: string };

type Professor = {
  id: number;
  name: string;
  hospital: string;
  schedules: Schedule[];
};

type Visit = {
  professorId: number;
  period: string;
  date: string;
  memo: string;
};

type EventType = "시술" | "컨퍼런스" | "미팅" | "기타";
type ProcedureTag = "ICD" | "CRT-D" | "IPG" | "CRT-P" | "ICM" | "CSP";

type DemoEvent = {
  id: number;
  date: string;
  professorId: number;
  eventType: EventType;
  memo: string;
  procedureTags?: ProcedureTag[];
};

type ProductName = "ICD" | "CRT-D" | "IPG" | "CRT-P" | "ICM";

type KpiProductData = { asp: number; yearly: number; actual: number };

type KpiData = {
  rate: number;
  HV_asp: number;
  LV_asp: number;
  ICM_asp: number;
  products: Record<ProductName, KpiProductData>;
  hospitals: { id: number; name: string; products: Record<ProductName, number> }[];
};

export type DemoData = {
  professors: Professor[];
  visits: Visit[];
  events: DemoEvent[];
  kpiData: KpiData;
};

/** 예시 데이터로 채워진 상태인지 표시하는 플래그. 지우기 버튼 노출에만 씁니다. */
export const DEMO_FLAG_KEY = "demoDataLoaded";

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/** 오늘로부터 offset 일 떨어진 날짜 키. 음수면 과거. */
const dayOffset = (today: Date, offset: number) => {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  date.setDate(date.getDate() + offset);

  return formatDateKey(date);
};

/**
 * 오늘 기준 "지난 주 그 요일"로 되돌린 날짜.
 * 방문 이력이 각 교수의 실제 외래 요일에 찍히도록 맞추는 데 씁니다.
 */
const lastWeekday = (today: Date, weekdayIndex: number, weeksAgo: number) => {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = (date.getDay() - weekdayIndex + 7) % 7;

  date.setDate(date.getDate() - diff - weeksAgo * 7);

  return formatDateKey(date);
};

const 오전 = "오전";
const 오후 = "오후";

export const buildDemoData = (today: Date): DemoData => {
  const professors: Professor[] = [
    {
      id: 101,
      name: "김선우",
      hospital: "한빛대학교병원",
      schedules: [
        { day: "월", period: 오전 },
        { day: "목", period: 오후 },
      ],
    },
    {
      id: 102,
      name: "이도현",
      hospital: "한빛대학교병원",
      schedules: [
        { day: "화", period: 오후 },
        { day: "금", period: 오전 },
      ],
    },
    {
      id: 103,
      name: "박지환",
      hospital: "서일의료원",
      schedules: [
        { day: "수", period: 오전 },
        { day: "금", period: 오후 },
      ],
    },
    {
      id: 104,
      name: "정민석",
      hospital: "서일의료원",
      schedules: [{ day: "월", period: 오후 }],
    },
    {
      id: 105,
      name: "한소영",
      hospital: "강운성심병원",
      schedules: [
        { day: "화", period: 오전 },
        { day: "토", period: 오전 },
      ],
    },
    {
      id: 106,
      name: "오재현",
      hospital: "도원대학교병원",
      schedules: [
        { day: "수", period: 오후 },
        { day: "목", period: 오전 },
      ],
    },
  ];

  // 요일 인덱스: 일0 월1 화2 수3 목4 금5 토6
  const visits: Visit[] = [
    {
      professorId: 101,
      period: 오전,
      date: lastWeekday(today, 1, 1),
      memo: "CRT-D 업그레이드 케이스 논의. LV 리드 진입 어려웠던 지난 케이스 이후 quadripolar 선호. 다음 케이스 시 지참 요청받음.",
    },
    {
      professorId: 101,
      period: 오전,
      date: lastWeekday(today, 1, 2),
      memo: "원격 모니터링 등록률이 낮다는 피드백. 외래 간호사 대상 등록 절차 교육 요청.",
    },
    {
      professorId: 102,
      period: 오후,
      date: lastWeekday(today, 2, 1),
      memo: "ICM 시술 늘릴 의향 있음. 실신 환자 워크업 프로토콜에 넣는 것 검토 중. 관련 논문 전달하기로.",
    },
    {
      professorId: 103,
      period: 오전,
      date: lastWeekday(today, 3, 1),
      memo: "CSP(LBBAP) 전환 관심 높음. 딜리버리 시스 데모 요청. 다음 주 시술 때 참관 예정.",
    },
    {
      professorId: 103,
      period: 오전,
      date: lastWeekday(today, 3, 3),
      memo: "타사 페이스메이커 리드 호환 문의. 커넥터 규격(IS-1) 확인해서 회신 완료.",
    },
    {
      professorId: 104,
      period: 오후,
      date: lastWeekday(today, 1, 1),
      memo: "위탁 재고 중 dual-chamber IPG 잔여 2개. 이번 달 케이스 예상 4건이라 보충 필요.",
    },
    {
      professorId: 105,
      period: 오전,
      date: lastWeekday(today, 2, 2),
      memo: "MRI 조건부 호환 모델만 쓰겠다는 방침. 해당 라인업 리스트 정리해서 전달.",
    },
    {
      professorId: 106,
      period: 오후,
      date: lastWeekday(today, 3, 1),
      memo: "학회 발표용 자사 임상 데이터 요청. 본사 메디컬팀 경유해서 승인된 자료만 전달 예정.",
    },
    {
      professorId: 106,
      period: 오전,
      date: lastWeekday(today, 4, 2),
      memo: "ICD 환자 shock 이벤트 관련 프로그래밍 조정 상담. 필드 클리니컬과 동행 방문 필요.",
    },
  ];

  const events: DemoEvent[] = [
    {
      id: 201,
      date: dayOffset(today, 2),
      professorId: 103,
      eventType: "시술",
      memo: "LBBAP 케이스 참관. 딜리버리 시스 + 스타일렛 세트 지참.",
      procedureTags: ["IPG", "CSP"],
    },
    {
      id: 202,
      date: dayOffset(today, 5),
      professorId: 101,
      eventType: "시술",
      memo: "CRT-D 신규 이식. quadripolar LV 리드 요청 건.",
      procedureTags: ["CRT-D"],
    },
    {
      id: 203,
      date: dayOffset(today, -6),
      professorId: 105,
      eventType: "시술",
      memo: "ICM 삽입 2건 연속. 삽입 도구 여유분 확보해서 대응 완료.",
      procedureTags: ["ICM"],
    },
    {
      id: 204,
      date: dayOffset(today, 9),
      professorId: 106,
      eventType: "컨퍼런스",
      memo: "부정맥 심포지엄. 자사 세션 오후 2시, 부스 지원 필요.",
    },
    {
      id: 205,
      date: dayOffset(today, 1),
      professorId: 104,
      eventType: "미팅",
      memo: "구매팀 미팅 — 위탁 재고 정산 및 하반기 공급 단가 협의.",
    },
    {
      id: 206,
      date: dayOffset(today, -3),
      professorId: 102,
      eventType: "기타",
      memo: "외래 간호사 대상 원격 모니터링 등록 절차 교육 진행.",
    },
  ];

  // `actual` 은 앱의 갭 계산식(`gap = 연간목표/12 - 실적`)이 전제하는 대로
  // **이번 달 실적**으로 넣는다. 그래야 "이번달 목표를 한 제품으로 채운다면"
  // 역산이 실제 숫자를 내놓는다.
  const kpiData: KpiData = {
    rate: 1300,
    HV_asp: 12.1,
    LV_asp: 3.3,
    ICM_asp: 1.5,
    products: {
      ICD: { asp: 12.6, yearly: 24, actual: 1 },
      "CRT-D": { asp: 13.2, yearly: 12, actual: 1 },
      IPG: { asp: 3.4, yearly: 60, actual: 3 },
      "CRT-P": { asp: 5.6, yearly: 10, actual: 0 },
      ICM: { asp: 1.7, yearly: 40, actual: 2 },
    },
    hospitals: [],
  };

  return { professors, visits, events, kpiData };
};
