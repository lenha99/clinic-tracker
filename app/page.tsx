"use client";

import { useEffect, useMemo, useState } from "react";

type Schedule = {
  day: string;
  period: string;
};

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

type Clinic = {
  professor: Professor;
  period: string;
};

type EventType = "시술" | "컨퍼런스" | "미팅" | "기타";

type Event = {
  id: number;
  date: string;
  professorId: number;
  eventType: EventType;
  memo: string;
};

type TabKey = "home" | "calendar" | "history" | "kpi" | "professor";

const EVENT_PERIOD = "이벤트";
const MAX_VISIBLE_MEMO_HISTORIES = 5;
const eventTypes: EventType[] = ["시술", "컨퍼런스", "미팅", "기타"];
const scheduleDays = ["월", "화", "수", "목", "금", "토", "일"];
const navTabs: { key: TabKey; label: string }[] = [
  { key: "home", label: "홈" },
  { key: "calendar", label: "달력" },
  { key: "history", label: "히스토리" },
  { key: "kpi", label: "KPI" },
  { key: "professor", label: "관리" },
];

type ProductName = "ICD" | "CRT-D" | "IPG" | "CRT-P" | "ICM";

type KpiProduct = {
  name: ProductName;
  asp: number;
};

type KpiProductData = {
  asp: number;
  yearly: number;
  actual: number;
};

type KpiHospitalData = {
  id: number;
  name: string;
  products: Record<ProductName, number>;
};

type KpiData = {
  rate: number;
  HV_asp: number;
  LV_asp: number;
  ICM_asp: number;
  products: Record<ProductName, KpiProductData>;
  hospitals: KpiHospitalData[];
};

type KpiGroupResult = {
  rev: number;
  yAch: number;
  mAch: number;
};

const safeParseArray = <T,>(value: string | null): T[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const safeParseObject = <T,>(value: string | null): Partial<T> => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Partial<T>)
      : {};
  } catch {
    return {};
  }
};

const loadStoredProfessors = () => {
  if (typeof window === "undefined") return [];

  const savedProfessors = localStorage.getItem("professors");

  return safeParseArray<Professor>(savedProfessors);
};

const loadStoredVisits = () => {
  if (typeof window === "undefined") return [];

  const savedVisits = localStorage.getItem("visits");

  return safeParseArray<Visit>(savedVisits);
};

const loadStoredEvents = () => {
  if (typeof window === "undefined") return [];

  const savedEvents = localStorage.getItem("events");

  return safeParseArray<Event>(savedEvents);
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const weekdayAliases: Record<string, string> = {
  일요일: "일",
  월요일: "월",
  화요일: "화",
  수요일: "수",
  목요일: "목",
  금요일: "금",
  토요일: "토",
};

const kpiProducts: KpiProduct[] = [
  { name: "ICD", asp: 12.6 },
  { name: "CRT-D", asp: 13.2 },
  { name: "IPG", asp: 3.4 },
  { name: "CRT-P", asp: 5.6 },
  { name: "ICM", asp: 1.7 },
];

const createDefaultKpiData = (): KpiData => ({
  rate: 1300,
  HV_asp: 12.1,
  LV_asp: 3.3,
  ICM_asp: 1.5,
  products: {
    ICD: { asp: 12.6, yearly: 0, actual: 0 },
    "CRT-D": { asp: 13.2, yearly: 0, actual: 0 },
    IPG: { asp: 3.4, yearly: 0, actual: 0 },
    "CRT-P": { asp: 5.6, yearly: 0, actual: 0 },
    ICM: { asp: 1.7, yearly: 0, actual: 0 },
  },
  hospitals: [],
});

const loadStoredKpiData = () => {
  if (typeof window === "undefined") return createDefaultKpiData();

  const savedKpiData = safeParseObject<
    Partial<KpiData> & Partial<Record<ProductName, KpiProductData>>
  >(localStorage.getItem("kpiData"));
  const defaultKpiData = createDefaultKpiData();

  return {
    ...defaultKpiData,
    rate: Number(savedKpiData.rate ?? defaultKpiData.rate),
    HV_asp: Number(savedKpiData.HV_asp ?? defaultKpiData.HV_asp),
    LV_asp: Number(savedKpiData.LV_asp ?? defaultKpiData.LV_asp),
    ICM_asp: Number(savedKpiData.ICM_asp ?? defaultKpiData.ICM_asp),
    products: kpiProducts.reduce<Record<ProductName, KpiProductData>>(
      (acc, product) => {
        const productData =
          savedKpiData.products?.[product.name] ?? savedKpiData[product.name];

        acc[product.name] = {
          asp: Number(productData?.asp ?? defaultKpiData.products[product.name].asp),
          yearly: Number(productData?.yearly ?? 0),
          actual: Number(productData?.actual ?? 0),
        };

        return acc;
      },
      {} as Record<ProductName, KpiProductData>,
    ),
    hospitals: Array.isArray(savedKpiData.hospitals)
      ? savedKpiData.hospitals.map((hospital, index) => ({
          id: Number(hospital.id ?? Date.now() + index),
          name: String(hospital.name ?? ""),
          products: kpiProducts.reduce<Record<ProductName, number>>(
            (acc, product) => {
              acc[product.name] = Number(hospital.products?.[product.name] ?? 0);

              return acc;
            },
            {} as Record<ProductName, number>,
          ),
        }))
      : [],
  };
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const normalizeWeekday = (day: string) =>
  weekdayAliases[day.trim()] ?? day.trim().replace("요일", "");

const normalizePeriod = (period: string) => period.trim();

export default function Home() {
  const [tab, setTab] = useState<TabKey>("home");

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [kpiData, setKpiData] = useState<KpiData>(createDefaultKpiData);
  const [today, setToday] = useState<Date | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [hasLoadedStoredData, setHasLoadedStoredData] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("전체");

  const [selectedDate, setSelectedDate] = useState("");
  const [historyProfessorFilter, setHistoryProfessorFilter] = useState("전체");
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState<Set<string>>(
    new Set(),
  );

  const [newProfessor, setNewProfessor] = useState({
    name: "",
    hospital: "",
    schedules: [] as Schedule[],
  });

  const [newEvent, setNewEvent] = useState({
    date: "",
    professorId: 0,
    eventType: "시술" as EventType,
    memo: "",
  });

  const [scheduleDay, setScheduleDay] = useState("월");
  const [schedulePeriod, setSchedulePeriod] = useState("오전");
  // 이벤트 입력 폼은 홈탭에서 항상 표시되므로 별도 토글 상태가 필요 없습니다.
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingEventMemo, setEditingEventMemo] = useState("");
  const [editingVisitKey, setEditingVisitKey] = useState<string | null>(null);
  const [editingVisitMemo, setEditingVisitMemo] = useState("");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setProfessors(loadStoredProfessors());
      setVisits(loadStoredVisits());
      setEvents(loadStoredEvents());
      setKpiData(loadStoredKpiData());
      const currentDate = new Date();

      setToday(currentDate);
      setCalendarDate(currentDate);
      setHasLoadedStoredData(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredData) return;

    localStorage.setItem("professors", JSON.stringify(professors));
  }, [hasLoadedStoredData, professors]);

  useEffect(() => {
    if (!hasLoadedStoredData) return;

    localStorage.setItem("visits", JSON.stringify(visits));
  }, [hasLoadedStoredData, visits]);

  useEffect(() => {
    if (!hasLoadedStoredData) return;

    localStorage.setItem("events", JSON.stringify(events));
  }, [hasLoadedStoredData, events]);

  useEffect(() => {
    if (!hasLoadedStoredData) return;

    const savedKpiData = {
      rate: kpiData.rate,
      HV_asp: kpiData.HV_asp,
      LV_asp: kpiData.LV_asp,
      ICM_asp: kpiData.ICM_asp,
      ...kpiData.products,
      products: kpiData.products,
      hospitals: kpiData.hospitals,
    };

    localStorage.setItem("kpiData", JSON.stringify(savedKpiData));
  }, [hasLoadedStoredData, kpiData]);

  const activeToday = today ?? new Date(2000, 0, 1);
  const activeCalendarDate = calendarDate ?? activeToday;

  const todayDay = weekdays[activeToday.getDay()];

  const tomorrow = new Date(activeToday);

  tomorrow.setDate(activeToday.getDate() + 1);

  const tomorrowDay = weekdays[tomorrow.getDay()];

  const tomorrowDate = formatDateKey(tomorrow);

  const todayDate = formatDateKey(activeToday);

  const calendarYear = activeCalendarDate.getFullYear();

  const calendarMonth = activeCalendarDate.getMonth();

  const professorsById = useMemo(
    () => new Map(professors.map((professor) => [professor.id, professor])),
    [professors],
  );

  const hospitals = useMemo(
    () => [
      "전체",
      ...new Set(professors.map((p) => p.hospital).filter(Boolean)),
    ],
    [professors],
  );

  const clinicsByWeekday = useMemo(() => {
    const clinics = new Map<string, Clinic[]>(
      weekdays.map((weekday) => [weekday, []]),
    );

    professors.forEach((professor) => {
      professor.schedules.forEach((schedule) => {
        clinics.get(normalizeWeekday(schedule.day))?.push({
          professor,
          period: normalizePeriod(schedule.period),
        });
      });
    });

    clinics.forEach((dayClinics) => {
      dayClinics.sort((a, b) => {
        if (a.period === "오전" && b.period === "오후") return -1;

        if (a.period === "오후" && b.period === "오전") return 1;

        return a.professor.name.localeCompare(b.professor.name, "ko");
      });
    });

    return clinics;
  }, [professors]);

  const visitsByProfessor = useMemo(() => {
    const groupedVisits = new Map<number, Visit[]>();

    visits.forEach((visit) => {
      const professorVisits = groupedVisits.get(visit.professorId) ?? [];

      professorVisits.push(visit);
      groupedVisits.set(visit.professorId, professorVisits);
    });

    groupedVisits.forEach((professorVisits) => {
      professorVisits.sort(
        (a, b) =>
          parseDateKey(b.date).getTime() - parseDateKey(a.date).getTime(),
      );
    });

    return groupedVisits;
  }, [visits]);

  const visitsByDate = useMemo(() => {
    const groupedVisits = new Map<string, Visit[]>();

    visits.forEach((visit) => {
      const dayVisits = groupedVisits.get(visit.date) ?? [];

      dayVisits.push(visit);
      groupedVisits.set(visit.date, dayVisits);
    });

    return groupedVisits;
  }, [visits]);

  const eventsByDate = useMemo(() => {
    const groupedEvents = new Map<string, Event[]>();

    events.forEach((event) => {
      const dayEvents = groupedEvents.get(event.date) ?? [];

      dayEvents.push(event);
      groupedEvents.set(event.date, dayEvents);
    });

    return groupedEvents;
  }, [events]);

  const kpiSummary = useMemo(() => {
    const productResults = kpiProducts.reduce<
      Record<
        ProductName,
        KpiProductData & {
          rev: number;
          target: number;
          yAch: number;
          mAch: number;
        }
      >
    >(
      (acc, product) => {
        const productData = kpiData.products[product.name];
        const rev = productData.actual * productData.asp;
        const target = productData.yearly * productData.asp;
        const yAch = target ? (rev / target) * 100 : 0;
        const mAch = productData.yearly
          ? (productData.actual / (productData.yearly / 12)) * 100
          : 0;

        acc[product.name] = {
          ...productData,
          rev,
          target,
          yAch,
          mAch,
        };

        return acc;
      },
      {} as Record<
        ProductName,
        KpiProductData & {
          rev: number;
          target: number;
          yAch: number;
          mAch: number;
        }
      >,
    );

    const group = (
      names: ProductName[],
      asp: number,
    ): KpiGroupResult => {
      const totalActual = names.reduce(
        (sum, name) => sum + productResults[name].actual,
        0,
      );
      const totalYearly = names.reduce(
        (sum, name) => sum + productResults[name].yearly,
        0,
      );
      const rev = totalActual * asp;
      const target = totalYearly * asp;

      return {
        rev,
        yAch: target ? (rev / target) * 100 : 0,
        mAch: target / 12 ? (rev / (target / 12)) * 100 : 0,
      };
    };

    const totalRev = kpiProducts.reduce(
      (sum, product) => sum + productResults[product.name].rev,
      0,
    );
    const totalTarget = kpiProducts.reduce(
      (sum, product) => sum + productResults[product.name].target,
      0,
    );
    const monthlyTarget = totalTarget / 12;
    const gap = Math.max(0, monthlyTarget - totalRev);

    return {
      productResults,
      groups: {
        HV: group(["ICD", "CRT-D"], kpiData.HV_asp),
        LV: group(["IPG", "CRT-P"], kpiData.LV_asp),
        ICM: group(["ICM"], kpiData.ICM_asp),
      },
      totalRev,
      totalTarget,
      totalAch: totalTarget ? (totalRev / totalTarget) * 100 : 0,
      monthlyAch: monthlyTarget ? (totalRev / monthlyTarget) * 100 : 0,
      gap,
    };
  }, [kpiData]);

  const formattedToday = `${activeToday.getFullYear()}년 ${
    activeToday.getMonth() + 1
  }월 ${activeToday.getDate()}일 ${todayDay}요일`;

  const formattedTomorrow = `${tomorrow.getFullYear()}년 ${
    tomorrow.getMonth() + 1
  }월 ${tomorrow.getDate()}일 ${tomorrowDay}요일`;

  const getClinicsByDay = (day: string) => {
    return clinicsByWeekday.get(day) ?? [];
  };

  const filterClinic = (item: Clinic) => {
    const matchSearch = item.professor.name
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const matchHospital =
      hospitalFilter === "전체" || item.professor.hospital === hospitalFilter;

    return matchSearch && matchHospital;
  };

  const todaysClinics = getClinicsByDay(todayDay).filter(filterClinic);
  const todaysEvents = eventsByDate.get(todayDate) ?? [];

  const tomorrowsClinics = getClinicsByDay(tomorrowDay);

  const morningClinics = todaysClinics.filter((item) => item.period === "오전");

  const afternoonClinics = todaysClinics.filter(
    (item) => item.period === "오후",
  );

  const tomorrowMorningClinics = tomorrowsClinics.filter(
    (item) => item.period === "오전",
  );

  const tomorrowAfternoonClinics = tomorrowsClinics.filter(
    (item) => item.period === "오후",
  );

  const selectedDateClinics = (() => {
    if (!selectedDate) return [];

    const date = parseDateKey(selectedDate);
    const selectedDay = weekdays[date.getDay()];

    return getClinicsByDay(selectedDay);
  })();

  const selectedDateVisits = visitsByDate.get(selectedDate) ?? [];
  const selectedDateEvents = eventsByDate.get(selectedDate) ?? [];
  const historyProfessors = professors.filter(
    (professor) =>
      historyProfessorFilter === "전체" ||
      String(professor.id) === historyProfessorFilter,
  );

  const moveCalendarMonth = (monthOffset: number) => {
    setCalendarDate(
      (currentDate) =>
        new Date(
          (currentDate || activeToday).getFullYear(),
          (currentDate || activeToday).getMonth() + monthOffset,
          1,
        ),
    );
    setSelectedDate("");
  };

  const toggleHistory = (key: string) => {
    setExpandedHistoryKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  };

  const achievementClass = (value: number) => {
    if (value >= 100) return "text-green-600";
    if (value >= 80) return "text-amber-500";

    return "text-red-500";
  };

  const formatCurrency = (value: number) => value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

  const updateKpiProduct = (
    productName: ProductName,
    field: keyof KpiProductData,
    value: number,
  ) => {
    setKpiData((currentData) => ({
      ...currentData,
      products: {
        ...currentData.products,
        [productName]: {
          ...currentData.products[productName],
          [field]: Math.max(0, value || 0),
        },
      },
    }));
  };

  const changeKpiActual = (productName: ProductName, amount: number) => {
    setKpiData((currentData) => {
      const productData = currentData.products[productName];

      return {
        ...currentData,
        products: {
          ...currentData.products,
          [productName]: {
            ...productData,
            actual: Math.max(0, productData.actual + amount),
          },
        },
      };
    });
  };

  const addSchedule = () => {
    const exists = newProfessor.schedules.some(
      (schedule) =>
        normalizeWeekday(schedule.day) === normalizeWeekday(scheduleDay) &&
        normalizePeriod(schedule.period) === normalizePeriod(schedulePeriod),
    );

    if (exists) return;

    setNewProfessor({
      ...newProfessor,
      schedules: [
        ...newProfessor.schedules,
        {
          day: normalizeWeekday(scheduleDay),
          period: normalizePeriod(schedulePeriod),
        },
      ],
    });
  };

  const addProfessor = () => {
    if (!newProfessor.name) return;

    const professor: Professor = {
      id: Date.now(),
      name: newProfessor.name,
      hospital: newProfessor.hospital,
      schedules: newProfessor.schedules,
    };

    setProfessors([...professors, professor]);

    setNewProfessor({
      name: "",
      hospital: "",
      schedules: [],
    });
  };

  const removeProfessor = (id: number) => {
    setProfessors(professors.filter((professor) => professor.id !== id));
    setVisits(visits.filter((visit) => visit.professorId !== id));
  };

  const getEventVisit = (event: Event) => {
    return visits.find(
      (visit) =>
        visit.professorId === event.professorId &&
        visit.date === event.date &&
        visit.period === EVENT_PERIOD,
    );
  };

  const addEvent = () => {
    if (!newEvent.date || !newEvent.professorId) return;

    const professor = professors.find((professor) => professor.id === newEvent.professorId);

    if (!professor) return;

    const event: Event = {
      id: Date.now(),
      date: newEvent.date,
      professorId: newEvent.professorId,
      eventType: newEvent.eventType,
      memo: newEvent.memo,
    };

    setEvents([...events, event]);

    const existing = visits.find(
      (visit) =>
        visit.professorId === event.professorId &&
        visit.date === event.date &&
        visit.period === EVENT_PERIOD,
    );

    if (!existing) {
      setVisits([
        ...visits,
        {
          professorId: event.professorId,
          period: EVENT_PERIOD,
          date: event.date,
          memo: event.memo,
        },
      ]);
    } else if (event.memo && !existing.memo) {
      setVisits(
        visits.map((visit) =>
          visit.professorId === event.professorId &&
          visit.period === EVENT_PERIOD &&
          visit.date === event.date
            ? { ...visit, memo: event.memo }
            : visit,
        ),
      );
    }

    setNewEvent({
      date: "",
      professorId: 0,
      eventType: "시술",
      memo: "",
    });
  };

  const removeEvent = (id: number) => {
    const eventToRemove = events.find((event) => event.id === id);

    setEvents(events.filter((event) => event.id !== id));
    setEditingEventId((currentId) => (currentId === id ? null : currentId));

    if (eventToRemove) {
      const hasSiblingEvent = events.some(
        (event) =>
          event.id !== id &&
          event.professorId === eventToRemove.professorId &&
          event.date === eventToRemove.date,
      );

      if (!hasSiblingEvent) {
        setVisits(
          visits.filter(
            (visit) =>
              !(
                visit.professorId === eventToRemove.professorId &&
                visit.date === eventToRemove.date &&
                visit.period === EVENT_PERIOD
              ),
          ),
        );
      }
    }
  };

  const isVisitedToday = (professorId: number, period: string) => {
    return (visitsByDate.get(todayDate) ?? []).some(
      (visit) =>
        visit.professorId === professorId &&
        visit.period === period,
    );
  };

  const getLastContact = (professorId: number) => {
    const lastVisit = visitsByProfessor.get(professorId)?.[0];

    const lastEvent = events
      .filter((e) => e.professorId === professorId)
      .sort((a, b) => parseDateKey(b.date).getTime() - parseDateKey(a.date).getTime())[0];

    if (!lastVisit && !lastEvent) return null;
    if (!lastVisit) return lastEvent;
    if (!lastEvent) return lastVisit;

    const visitDate = parseDateKey(lastVisit.date).getTime();
    const eventDate = parseDateKey(lastEvent.date).getTime();

    return visitDate > eventDate ? lastVisit : lastEvent;
  };

  // Toggle visit for an arbitrary date/period (used for events)
  const toggleVisitForDate = (
    professorId: number,
    date: string,
    period = EVENT_PERIOD,
  ) => {
    const exists = visits.find(
      (visit) => visit.professorId === professorId && visit.period === period && visit.date === date,
    );

    if (exists) {
      setVisits(
        visits.filter(
          (visit) => !(visit.professorId === professorId && visit.period === period && visit.date === date),
        ),
      );
    } else {
      setVisits([
        ...visits,
        {
          professorId,
          period,
          date,
          memo: "",
        },
      ]);
      }
  };

  const toggleVisit = (professorId: number, period: string) => {
    toggleVisitForDate(professorId, todayDate, period);
  };

  const updateMemo = (
    professorId: number,
    period: string,
    date: string,
    memo: string,
    eventId?: number,
  ) => {
    if (period === EVENT_PERIOD && typeof eventId === "number") {
      const existingVisit = visits.find(
        (visit) =>
          visit.professorId === professorId &&
          visit.period === period &&
          visit.date === date,
      );

      setVisits(
        existingVisit
          ? visits.map((visit) =>
              visit.professorId === professorId &&
              visit.period === period &&
              visit.date === date
                ? { ...visit, memo }
                : visit,
            )
          : [
              ...visits,
              {
                professorId,
                period,
                date,
                memo,
              },
            ],
      );
      setEvents(
        events.map((event) =>
          event.professorId === professorId &&
          event.date === date &&
          event.id === eventId
            ? { ...event, memo }
            : event,
        ),
      );

      return;
    }

    setVisits(
      visits.map((visit) => {
        if (visit.professorId === professorId && visit.period === period && visit.date === date) {
          return { ...visit, memo };
        }

        return visit;
      }),
    );
  };

  const getVisitKey = (professorId: number, period: string, date: string) =>
    `${professorId}-${period}-${date}`;

  const getMemoHistories = (professorId: number) => {
    const historiesByKey = new Map<string, Visit>();

    (visitsByProfessor.get(professorId) ?? []).forEach((visit) => {
      if (!visit.memo) return;

      historiesByKey.set(
        getVisitKey(visit.professorId, visit.period, visit.date),
        visit,
      );
    });

    events
      .filter((event) => event.professorId === professorId)
      .forEach((event) => {
        const eventVisit = getEventVisit(event);

        if (eventVisit?.memo) return;
        if (!event.memo) return;

        historiesByKey.set(getVisitKey(event.professorId, EVENT_PERIOD, event.date), {
          professorId: event.professorId,
          period: EVENT_PERIOD,
          date: event.date,
          memo: event.memo,
        });
      });

    return [...historiesByKey.values()].sort((a, b) => {
      const dateDiff = parseDateKey(b.date).getTime() - parseDateKey(a.date).getTime();

      if (dateDiff !== 0) return dateDiff;

      return a.period.localeCompare(b.period, "ko");
    });
  };

  const getLastVisitElapsedText = (professorId: number) => {
    const lastVisit = visitsByProfessor.get(professorId)?.[0];

    if (!lastVisit) return "방문 기록 없음";

    const diffDays = Math.max(
      0,
      Math.floor(
        (activeToday.getTime() - parseDateKey(lastVisit.date).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return `${diffDays}일 전 방문`;
  };

  const renderMemoHistory = (
    histories: Visit[],
    historyKey: string,
    keyPrefix: string,
  ) => {
    const isHistoryExpanded = expandedHistoryKeys.has(historyKey);

    if (histories.length === 0) return null;

    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => toggleHistory(historyKey)}
          className="w-full rounded-2xl bg-white px-3 py-2 text-left text-sm font-bold text-gray-700"
        >
          메모 히스토리 {histories.length}개{" "}
          {isHistoryExpanded ? "접기" : "보기"}
        </button>

        {isHistoryExpanded && (
          <div className="mt-2 space-y-2">
            {histories.slice(0, MAX_VISIBLE_MEMO_HISTORIES).map((history, idx) => (
              <div
                key={`${keyPrefix}-${history.date}-${history.period}-${idx}`}
                className="rounded-2xl bg-white p-3 text-sm text-gray-900"
              >
                <div className="font-bold">
                  {history.date} · {history.period}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-gray-700">
                  {history.memo || "메모 없음"}
                </div>
              </div>
            ))}

            {histories.length > MAX_VISIBLE_MEMO_HISTORIES && (
              <div className="rounded-2xl bg-white/70 p-3 text-sm font-bold text-gray-600">
                오래된 메모 {histories.length - MAX_VISIBLE_MEMO_HISTORIES}개 더 있음
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEventCard = (event: Event) => {
    const professor = professorsById.get(event.professorId);

    if (!professor) return null;

    const eventVisit = getEventVisit(event);
    const eventMemo = eventVisit?.memo ?? event.memo;
    const isEditing = editingEventId === event.id;
    const historyKey = `event-${event.id}`;
    const histories = getMemoHistories(event.professorId);
    const lastVisitElapsedText = getLastVisitElapsedText(event.professorId);

    return (
      <div
        key={event.id}
        className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-gray-900">
              {professor.name}
            </div>

            <div className="text-sm text-gray-600">
              {professor.hospital || "병원 미입력"}
            </div>

            <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">
              {lastVisitElapsedText}
            </div>

            <div className="mt-2 text-sm text-gray-900">{event.eventType}</div>

            <div className="mt-1 text-xs text-gray-600">{event.date}</div>

            {isEditing ? (
              <div className="mt-3">
                <div className="mb-2 text-sm font-bold text-gray-900">
                  방문 메모
                </div>

                <textarea
                  value={editingEventMemo}
                  onChange={(e) => setEditingEventMemo(e.target.value)}
                  className="w-full rounded-2xl border p-3 text-sm text-gray-900"
                  rows={3}
                />

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateMemo(
                        event.professorId,
                        EVENT_PERIOD,
                        event.date,
                        editingEventMemo,
                        event.id,
                      );
                      setEditingEventId(null);
                    }}
                    className="rounded-2xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    저장
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingEventId(null)}
                    className="rounded-2xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-900"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-900">
                <div className="mb-1 font-bold">방문 메모</div>
                <div className="whitespace-pre-wrap text-gray-700">
                  {eventMemo || "메모 없음"}
                </div>
              </div>
            )}

            {renderMemoHistory(histories, historyKey, `event-${event.id}`)}
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => toggleVisitForDate(event.professorId, event.date, EVENT_PERIOD)}
                  className={`min-h-10 flex-1 rounded-2xl px-3 py-2 text-xs font-bold text-white sm:flex-none ${
                    eventVisit ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {eventVisit ? "방문완료" : "방문체크"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingEventId(event.id);
                    setEditingEventMemo(eventMemo);
                  }}
                  className="min-h-10 flex-1 rounded-2xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-900 sm:flex-none"
                >
                  메모 편집
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => removeEvent(event.id)}
              className="min-h-10 flex-1 rounded-2xl bg-red-500 px-3 py-2 text-xs font-bold text-white sm:flex-none"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderClinicCard = (item: Clinic) => {
    const visited = isVisitedToday(item.professor.id, item.period);

    const histories = getMemoHistories(item.professor.id);

    const todayVisit = (visitsByDate.get(todayDate) ?? []).find(
      (visit) =>
        visit.professorId === item.professor.id &&
        visit.period === item.period &&
        visit.date === todayDate,
    );

    const todayEvent = events.find(
      (event) => event.professorId === item.professor.id && event.date === todayDate,
    );

    const historyKey = `${item.professor.id}-${item.period}`;
    const visitKey = getVisitKey(item.professor.id, item.period, todayDate);
    const isEditingVisitMemo = editingVisitKey === visitKey;

    const lastContact = getLastContact(item.professor.id);
    const lastVisitElapsedText = getLastVisitElapsedText(item.professor.id);

    let lastContactText = "기록 없음";

    if (lastContact) {
      if ("eventType" in lastContact) {
        lastContactText = `이벤트: ${lastContact.date}`;
      } else {
        lastContactText = `방문: ${lastContact.date}`;
      }
    }

    return (
      <div
        key={`${item.professor.id}-${item.period}`}
        className={`rounded-3xl border p-5 shadow-sm ${
          visited ? "border-green-500 bg-green-50" : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-gray-900">{item.professor.name}</div>

            <div className="text-sm text-gray-600">
              {item.professor.hospital}
            </div>

            <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">
              {lastVisitElapsedText}
            </div>

            <div className="mt-2 text-sm text-gray-900">{item.period} 외래</div>

            <div className="mt-3 text-sm font-medium text-gray-800">
              마지막 접촉: {lastContactText}
            </div>

            <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-gray-900">
              최근 메모: {lastContact && "memo" in lastContact ? (lastContact.memo || "없음") : "없음"}
            </div>

            {todayEvent && (
              <div className="mt-3 rounded-2xl bg-purple-50 p-3 text-sm text-gray-900">
                오늘 이벤트: {todayEvent.eventType}
                {getEventVisit(todayEvent)?.memo || todayEvent.memo
                  ? ` - ${getEventVisit(todayEvent)?.memo ?? todayEvent.memo}`
                  : ""}
              </div>
            )}

            {visited && isEditingVisitMemo && (
              <div className="mt-3">
                <div className="mb-2 text-sm font-bold text-gray-900">방문 메모</div>

                <textarea
                  placeholder="교수님 반응 / 다음 액션 / 케이스 예정 등 입력"
                  value={editingVisitMemo}
                  onChange={(e) => setEditingVisitMemo(e.target.value)}
                  className="w-full rounded-2xl border p-3 text-sm text-gray-900"
                  rows={3}
                />

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateMemo(
                        item.professor.id,
                        item.period,
                        todayDate,
                        editingVisitMemo,
                      );
                      setEditingVisitKey(null);
                    }}
                    className="rounded-2xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    저장
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingVisitKey(null)}
                    className="rounded-2xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-900"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {visited && !isEditingVisitMemo && (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-900">
                <div className="mb-1 font-bold">방문 메모</div>
                <div className="whitespace-pre-wrap text-gray-700">
                  {todayVisit?.memo || "메모 없음"}
                </div>
              </div>
            )}

            {!visited && (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-700">
                방문 체크 후 메모를 편집할 수 있습니다.
              </div>
            )}

            {renderMemoHistory(histories, historyKey, historyKey)}
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={() => {
                toggleVisit(item.professor.id, item.period);
                if (isEditingVisitMemo) {
                  setEditingVisitKey(null);
                }
              }}
              className={`min-h-10 flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-white whitespace-nowrap sm:flex-none ${
                visited ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {visited ? "방문완료" : "방문체크"}
            </button>

            {visited && !isEditingVisitMemo && (
              <button
                type="button"
                onClick={() => {
                  setEditingVisitKey(visitKey);
                  setEditingVisitMemo(todayVisit?.memo || "");
                }}
                className="min-h-10 flex-1 rounded-2xl bg-gray-200 px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap sm:flex-none"
              >
                메모 편집
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const daysInMonth = new Date(
    calendarYear,
    calendarMonth + 1,
    0,
  ).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();

  if (!today || !calendarDate) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-24">
        <div className="mx-auto max-w-md">
          <div className="mb-5 text-3xl font-bold text-gray-900">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24 text-gray-900">
      <div className="mx-auto max-w-md">
        <div className="mb-5 text-3xl font-bold">외래 방문 트래커</div>

        {/* HOME */}
        {tab === "home" && (
          <>
            <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">오늘 날짜</div>

              <div className="mt-1 text-xl font-bold">{formattedToday}</div>
            </div>

            <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="교수 검색"
                className="w-full rounded-2xl border p-3 text-gray-900"
              />

              <div className="mt-3 flex gap-2 overflow-x-auto">
                {hospitals.map((hospital) => (
                  <button
                    key={hospital}
                    onClick={() => setHospitalFilter(hospital)}
                    className={`rounded-full px-4 py-2 text-sm whitespace-nowrap ${
                      hospitalFilter === hospital
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {hospital}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 text-lg font-bold">이벤트 추가</div>

              <div className="space-y-3">
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      date: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border p-3 text-gray-900"
                />

                <select
                  value={newEvent.professorId}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      professorId: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-2xl border p-3 text-gray-900"
                >
                  <option value={0}>교수님 선택</option>
                  {professors.map((professor) => (
                    <option key={professor.id} value={professor.id}>
                      {professor.name} ({professor.hospital})
                    </option>
                  ))}
                </select>

                <select
                  value={newEvent.eventType}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      eventType: e.target.value as EventType,
                    })
                  }
                  className="w-full rounded-2xl border p-3 text-gray-900"
                >
                  {eventTypes.map((eventType) => (
                    <option key={eventType}>{eventType}</option>
                  ))}
                </select>

                <textarea
                  value={newEvent.memo}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      memo: e.target.value,
                    })
                  }
                  placeholder="이벤트 메모 (선택사항)"
                  className="w-full rounded-2xl border p-3 text-gray-900"
                  rows={3}
                />

                <button
                  onClick={addEvent}
                  className="w-full rounded-2xl bg-purple-600 p-3 font-bold text-white"
                >
                  이벤트 저장
                </button>
              </div>
            </div>

            {todaysEvents.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 text-lg font-bold">오늘 이벤트</div>

                <div className="space-y-3">
                  {todaysEvents.map(renderEventCard)}
                </div>
              </div>
            )}

            {/* 오전 */}
            <div className="mb-6">
              <div className="mb-3 text-lg font-bold">오전 외래</div>

              <div className="space-y-4">
                {morningClinics.map(renderClinicCard)}
                {morningClinics.length === 0 && (
                  <div className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-500">
                    예정된 오전 외래 없음
                  </div>
                )}
              </div>
            </div>

            {/* 오후 */}
            <div className="mb-6">
              <div className="mb-3 text-lg font-bold">오후 외래</div>

              <div className="space-y-4">
                {afternoonClinics.map(renderClinicCard)}
                {afternoonClinics.length === 0 && (
                  <div className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-500">
                    예정된 오후 외래 없음
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">내일 날짜</div>

              <div className="mt-1 text-lg font-bold">{formattedTomorrow}</div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 font-bold">오전 외래</div>

                  <div className="space-y-2">
                    {tomorrowMorningClinics.map((item) => (
                      <div
                        key={`${tomorrowDate}-${item.professor.id}-${item.period}`}
                        className="rounded-2xl bg-blue-50 p-3 text-sm"
                      >
                        <div className="font-bold text-gray-900">{item.professor.name}</div>

                        <div className="text-gray-600">
                          {item.professor.hospital || "병원 미입력"}
                        </div>
                      </div>
                    ))}

                    {tomorrowMorningClinics.length === 0 && (
                      <div className="rounded-2xl bg-gray-100 p-3 text-sm text-gray-500">
                        예정된 오전 외래 없음
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 font-bold">오후 외래</div>

                  <div className="space-y-2">
                    {tomorrowAfternoonClinics.map((item) => (
                      <div
                        key={`${tomorrowDate}-${item.professor.id}-${item.period}`}
                        className="rounded-2xl bg-purple-50 p-3 text-sm"
                      >
                        <div className="font-bold text-gray-900">{item.professor.name}</div>

                        <div className="text-gray-600">
                          {item.professor.hospital || "병원 미입력"}
                        </div>
                      </div>
                    ))}

                    {tomorrowAfternoonClinics.length === 0 && (
                      <div className="rounded-2xl bg-gray-100 p-3 text-sm text-gray-500">
                        예정된 오후 외래 없음
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => moveCalendarMonth(-1)}
                className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-900"
              >
                이전
              </button>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {calendarYear}년 {calendarMonth + 1}월
                </div>

                <div className="text-sm text-gray-500">방문 캘린더</div>
              </div>

              <button
                type="button"
                onClick={() => moveCalendarMonth(1)}
                className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-900"
              >
                다음
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekdays.map((day) => (
                <div key={day} className="text-center text-sm font-bold text-gray-900">
                  {day}
                </div>
              ))}

              {/* 시작 요일 빈칸 */}
              {Array.from({
                length: firstDayOfMonth,
              }).map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}

              {/* 날짜 */}
              {Array.from({
                length: daysInMonth,
              }).map((_, i) => {
                const day = i + 1;

                const dateString = `${calendarYear}-${String(
                  calendarMonth + 1,
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                const currentDate = new Date(calendarYear, calendarMonth, day);

                const currentDay = weekdays[currentDate.getDay()];

                const daySchedules = getClinicsByDay(currentDay);

                const dayVisits = visitsByDate.get(dateString) ?? [];
                const dayEvents = eventsByDate.get(dateString) ?? [];
                const isToday = dateString === todayDate;
                const isSelected = dateString === selectedDate;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(dateString)}
                    className={`min-h-[140px] cursor-pointer rounded-2xl border bg-gray-50 p-2 text-gray-900 ${
                      isToday ? "border-2 border-blue-500" : "border-gray-200"
                    } ${
                      isSelected ? "bg-purple-50 ring-2 ring-purple-400 ring-offset-2" : ""
                    }`}
                  >
                    <div className="font-bold">{day}</div>

                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {daySchedules.map((item, idx) => {
                        const visited = dayVisits.some(
                          (v) =>
                            v.professorId === item.professor.id &&
                            v.period === item.period,
                        );
                        const shortName =
                          item.professor.name.length <= 3
                            ? item.professor.name
                            : item.professor.name.slice(0, 3);

                        return (
                          <span
                            key={idx}
                            className={`rounded px-1 py-0.5 text-[9px] font-medium leading-tight whitespace-nowrap ${
                              visited
                                ? "bg-green-500 text-white"
                                : "bg-gray-300 text-gray-700"
                            }`}
                          >
                            {shortName}
                          </span>
                        );
                      })}

                      {dayEvents.map((event, idx) => (
                        <span
                          key={`event-${idx}`}
                          className="rounded px-1 py-0.5 text-[9px] font-medium leading-tight whitespace-nowrap bg-purple-400 text-white"
                        >
                          {event.eventType.slice(0, 2)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6 rounded-3xl bg-gray-100 p-4">
                <div className="mb-1 text-lg font-bold text-gray-900">{selectedDate}</div>

                <div className="mb-4 text-sm text-gray-500">
                  선택한 날짜의 일정
                </div>

                <div className="space-y-3">
                  {selectedDateClinics.map((item) => {
                    const visit = selectedDateVisits.find(
                      (selectedVisit) =>
                        selectedVisit.professorId === item.professor.id &&
                        selectedVisit.period === item.period,
                    );

                    return (
                      <div
                        key={`${selectedDate}-${item.professor.id}-${item.period}`}
                        className="rounded-2xl bg-white p-4 text-gray-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold">
                              {item.professor.name}
                            </div>

                            <div className="mt-1 text-sm text-gray-600">
                              {item.professor.hospital || "병원 미입력"}
                            </div>

                            <div className="mt-2 text-sm">
                              {item.period} 외래
                            </div>

                            {visit?.memo && (
                              <div className="mt-2 rounded-xl bg-gray-100 p-2 text-sm text-gray-700">
                                메모: {visit.memo}
                              </div>
                            )}
                          </div>

                          <div
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                              visit
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {visit ? "방문완료" : "방문전"}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {selectedDateEvents.map(renderEventCard)}

                  {selectedDateClinics.length === 0 && selectedDateEvents.length === 0 && (
                    <div className="text-sm text-gray-500">
                      예정된 일정 없음
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-1 text-xl font-bold text-gray-900">
                교수별 메모 히스토리
              </div>
              <div className="text-sm text-gray-500">
                최신순으로 전체 메모를 확인합니다.
              </div>

              <select
                value={historyProfessorFilter}
                onChange={(e) => setHistoryProfessorFilter(e.target.value)}
                className="mt-4 w-full rounded-2xl border p-3 text-gray-900"
              >
                <option value="전체">전체 교수</option>
                {professors.map((professor) => (
                  <option key={professor.id} value={String(professor.id)}>
                    {professor.name} ({professor.hospital || "병원 미입력"})
                  </option>
                ))}
              </select>
            </div>

            {historyProfessors.map((professor) => {
              const histories = getMemoHistories(professor.id);

              if (histories.length === 0) return null;

              return (
                <div
                  key={professor.id}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="text-lg font-bold text-gray-900">
                    {professor.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {professor.hospital || "병원 미입력"}
                  </div>

                  <div className="mt-4 space-y-2">
                    {histories.map((history, idx) => (
                      <div
                        key={`${professor.id}-${history.date}-${history.period}-${idx}`}
                        className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-900"
                      >
                        <div className="font-bold">
                          {history.date} · {history.period}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-gray-700">
                          {history.memo}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {historyProfessors.every(
              (professor) => getMemoHistories(professor.id).length === 0,
            ) && (
              <div className="rounded-3xl bg-white p-5 text-sm text-gray-500 shadow-sm">
                아직 저장된 메모가 없습니다.
              </div>
            )}
          </div>
        )}

        {/* KPI */}
        {tab === "kpi" && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 text-xl font-bold text-gray-900">Sales KPI</div>

              <label className="text-sm font-bold text-gray-600">환율</label>

              <input
                type="number"
                value={kpiData.rate}
                onChange={(e) =>
                  setKpiData({
                    ...kpiData,
                    rate: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="mt-2 w-full rounded-2xl border p-3 text-center text-gray-900"
              />
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 text-lg font-bold text-gray-900">그룹 ASP</div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["HV", "HV_asp"],
                  ["LV", "LV_asp"],
                  ["ICM", "ICM_asp"],
                ].map(([label, field]) => (
                  <label key={field} className="text-center text-sm">
                    <span className="mb-1 block font-bold text-gray-600">
                      {label}
                    </span>

                    <input
                      type="number"
                      value={kpiData[field as "HV_asp" | "LV_asp" | "ICM_asp"]}
                      onChange={(e) =>
                        setKpiData({
                          ...kpiData,
                          [field]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full rounded-2xl border p-3 text-center text-gray-900"
                    />
                  </label>
                ))}
              </div>
            </div>

            {kpiProducts.map((product) => {
              const productData = kpiData.products[product.name];
              const result = kpiSummary.productResults[product.name];

              return (
                <div
                  key={product.name}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 text-xl font-bold text-gray-900">{product.name}</div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-center text-sm">
                      <span className="mb-1 block font-bold text-gray-600">
                        ASP
                      </span>

                      <input
                        type="number"
                        value={productData.asp}
                        onChange={(e) =>
                          updateKpiProduct(
                            product.name,
                            "asp",
                            Number(e.target.value),
                          )
                        }
                        className="w-full rounded-2xl border p-3 text-center text-gray-900"
                      />
                    </label>

                    <label className="text-center text-sm">
                      <span className="mb-1 block font-bold text-gray-600">
                        연간목표
                      </span>

                      <input
                        type="number"
                        value={productData.yearly}
                        onChange={(e) =>
                          updateKpiProduct(
                            product.name,
                            "yearly",
                            Number(e.target.value),
                          )
                        }
                        className="w-full rounded-2xl border p-3 text-center text-gray-900"
                      />
                    </label>

                    <div className="text-center text-sm">
                      <div className="mb-1 font-bold text-gray-600">Actual</div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeKpiActual(product.name, -1)}
                          className="rounded-xl bg-gray-200 px-3 py-3 font-bold text-gray-900"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          value={productData.actual}
                          onChange={(e) =>
                            updateKpiProduct(
                              product.name,
                              "actual",
                              Number(e.target.value),
                            )
                          }
                          className="min-w-0 flex-1 rounded-2xl border p-3 text-center text-gray-900"
                        />

                        <button
                          type="button"
                          onClick={() => changeKpiActual(product.name, 1)}
                          className="rounded-xl bg-gray-200 px-3 py-3 font-bold text-gray-900"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-sm text-gray-900">
                    연:{" "}
                    <span
                      className={`font-bold ${achievementClass(result.yAch)}`}
                    >
                      {result.yAch.toFixed(1)}%
                    </span>{" "}
                    | 월:{" "}
                    <span
                      className={`font-bold ${achievementClass(result.mAch)}`}
                    >
                      {result.mAch.toFixed(1)}%
                    </span>
                    <div className="mt-1 text-gray-700">
                      ${formatCurrency(result.rev)} / ₩
                      {formatCurrency(result.rev * kpiData.rate)}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 text-lg font-bold text-gray-900">그룹</div>

              <div className="space-y-3">
                {Object.entries(kpiSummary.groups).map(([name, group]) => (
                  <div key={name} className="rounded-2xl bg-gray-50 p-4 text-gray-900">
                    <div className="mb-2 text-lg font-bold">{name}</div>

                    <div className="text-sm">
                      연:{" "}
                      <span
                        className={`font-bold ${achievementClass(group.yAch)}`}
                      >
                        {group.yAch.toFixed(1)}%
                      </span>{" "}
                      | 월:{" "}
                      <span
                        className={`font-bold ${achievementClass(group.mAch)}`}
                      >
                        {group.mAch.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-gray-700">
                      ${formatCurrency(group.rev)} / ₩
                      {formatCurrency(group.rev * kpiData.rate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 text-xl font-bold text-gray-900">TOTAL KPI</div>

              <div className="rounded-2xl bg-gray-50 p-4 text-lg font-bold text-gray-900">
                연:{" "}
                <span
                  className={achievementClass(kpiSummary.totalAch)}
                >
                  {kpiSummary.totalAch.toFixed(1)}%
                </span>{" "}
                | 월:{" "}
                <span
                  className={achievementClass(kpiSummary.monthlyAch)}
                >
                  {kpiSummary.monthlyAch.toFixed(1)}%
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-gray-900">
                <div>목표: ${formatCurrency(kpiSummary.totalTarget)}</div>
                <div>누적: ${formatCurrency(kpiSummary.totalRev)}</div>
                <div className="pt-2 text-base font-bold">
                  부족 매출: ${formatCurrency(kpiSummary.gap)}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-gray-900">
                <div className="mb-2 font-bold">
                  이번달 목표를 한 제품으로 채운다면
                </div>

                {(["ICD", "CRT-D", "IPG", "CRT-P"] as ProductName[]).map(
                  (name) => {
                    const asp = kpiData.products[name].asp;
                    const need = asp > 0 ? Math.ceil(kpiSummary.gap / asp) : 0;

                    return (
                      <div key={name} className="text-gray-900">
                        {name} → {need}개
                      </div>
                    );
                  },
                )}

                <div className="mt-2 text-xs text-gray-500">
                  한 제품 기준 / 월 목표 부족분 기준
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFESSOR & EVENT */}
        {tab === "professor" && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 text-xl font-bold text-gray-900">외래 추가</div>

              <input
                value={newProfessor.name}
                onChange={(e) =>
                  setNewProfessor({
                    ...newProfessor,
                    name: e.target.value,
                  })
                }
                placeholder="교수님명"
                className="mb-3 w-full rounded-2xl border p-3 text-gray-900"
              />

              <input
                value={newProfessor.hospital}
                onChange={(e) =>
                  setNewProfessor({
                    ...newProfessor,
                    hospital: e.target.value,
                  })
                }
                placeholder="병원명"
                className="mb-3 w-full rounded-2xl border p-3 text-gray-900"
              />

              <div className="mb-3 flex gap-2">
                <select
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(e.target.value)}
                  className="flex-1 rounded-2xl border p-3 text-gray-900"
                >
                  {scheduleDays.map((day) => (
                    <option key={day}>{day}</option>
                  ))}
                </select>

                <select
                  value={schedulePeriod}
                  onChange={(e) => setSchedulePeriod(e.target.value)}
                  className="flex-1 rounded-2xl border p-3 text-gray-900"
                >
                  <option>오전</option>

                  <option>오후</option>
                </select>
              </div>

              <button
                onClick={addSchedule}
                className="mb-4 w-full rounded-2xl bg-gray-200 p-3 font-bold text-gray-900"
              >
                외래 일정 추가
              </button>

              <div className="mb-4 flex flex-wrap gap-2">
                {newProfessor.schedules.map((schedule, idx) => (
                  <div
                    key={idx}
                    className="rounded-full bg-blue-100 px-3 py-2 text-sm text-gray-900"
                  >
                    {schedule.day}
                    요일 {schedule.period}
                  </div>
                ))}
              </div>

              <button
                onClick={addProfessor}
                className="w-full rounded-2xl bg-blue-600 p-4 font-bold text-white"
              >
                외래 저장
              </button>
            </div>

            {/* 교수 목록 */}
            <div className="space-y-3">
              {professors.map((professor) => (
                <div
                  key={professor.id}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold text-gray-900">{professor.name}</div>

                      <div className="text-sm text-gray-500">
                        {professor.hospital}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {professor.schedules.map((schedule, idx) => (
                          <div
                            key={idx}
                            className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-900"
                          >
                            {schedule.day}
                            요일 {schedule.period}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => removeProfessor(professor.id)}
                      className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NAV */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white">
          <div className="mx-auto flex max-w-md overflow-x-auto">
            {navTabs.map((navTab) => (
              <button
                key={navTab.key}
                onClick={() => setTab(navTab.key)}
                className={`min-w-16 flex-1 p-4 text-sm font-bold ${
                  tab === navTab.key ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {navTab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
