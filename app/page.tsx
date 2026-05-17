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

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

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

export default function Home() {
  const [tab, setTab] = useState("home");

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [kpiData, setKpiData] = useState<KpiData>(createDefaultKpiData);
  const [today, setToday] = useState<Date | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [hasLoadedStoredData, setHasLoadedStoredData] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("전체");

  const [selectedDate, setSelectedDate] = useState("");
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState<Set<string>>(
    new Set(),
  );

  const [newProfessor, setNewProfessor] = useState({
    name: "",
    hospital: "",
    schedules: [] as Schedule[],
  });

  const [scheduleDay, setScheduleDay] = useState("월");
  const [schedulePeriod, setSchedulePeriod] = useState("오전");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setProfessors(loadStoredProfessors());
      setVisits(loadStoredVisits());
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

  const currentYear = activeToday.getFullYear();

  const currentMonth = activeToday.getMonth();

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
        clinics.get(schedule.day)?.push({
          professor,
          period: schedule.period,
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

  const monthlyVisitCountsByHospital = useMemo(() => {
    return visits.reduce<Record<string, number>>((acc, visit) => {
      const visitDate = parseDateKey(visit.date);

      if (
        visitDate.getMonth() !== currentMonth ||
        visitDate.getFullYear() !== currentYear
      ) {
        return acc;
      }

      const professor = professorsById.get(visit.professorId);

      if (!professor) return acc;

      const hospital = professor.hospital || "미분류";

      acc[hospital] = (acc[hospital] || 0) + 1;

      return acc;
    }, {});
  }, [currentMonth, currentYear, professorsById, visits]);

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
    const hospitalProductTotals = kpiProducts.reduce<Record<ProductName, number>>(
      (acc, product) => {
        acc[product.name] = kpiData.hospitals.reduce(
          (sum, hospital) => sum + hospital.products[product.name],
          0,
        );

        return acc;
      },
      {} as Record<ProductName, number>,
    );
    const hospitalResults = kpiData.hospitals.map((hospital) => {
      const rev = kpiProducts.reduce(
        (sum, product) =>
          sum + hospital.products[product.name] * kpiData.products[product.name].asp,
        0,
      );

      return {
        ...hospital,
        rev,
      };
    });
    const hospitalTotalRev = hospitalResults.reduce(
      (sum, hospital) => sum + hospital.rev,
      0,
    );
    const hospitalGroup = (
      names: ProductName[],
      asp: number,
    ): KpiGroupResult => {
      const totalActual = names.reduce(
        (sum, name) => sum + hospitalProductTotals[name],
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
      hospitalProductTotals,
      hospitalResults,
      hospitalTotalRev,
      hospitalGroups: {
        HV: hospitalGroup(["ICD", "CRT-D"], kpiData.HV_asp),
        LV: hospitalGroup(["IPG", "CRT-P"], kpiData.LV_asp),
        ICM: hospitalGroup(["ICM"], kpiData.ICM_asp),
      },
      hospitalTotalAch: totalTarget ? (hospitalTotalRev / totalTarget) * 100 : 0,
      hospitalMonthlyAch: monthlyTarget
        ? (hospitalTotalRev / monthlyTarget) * 100
        : 0,
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

  const createEmptyHospitalProducts = () =>
    kpiProducts.reduce<Record<ProductName, number>>((acc, product) => {
      acc[product.name] = 0;

      return acc;
    }, {} as Record<ProductName, number>);

  const addKpiHospital = () => {
    setKpiData((currentData) => ({
      ...currentData,
      hospitals: [
        ...currentData.hospitals,
        {
          id: Date.now(),
          name: "",
          products: createEmptyHospitalProducts(),
        },
      ],
    }));
  };

  const updateKpiHospitalName = (hospitalId: number, name: string) => {
    setKpiData((currentData) => ({
      ...currentData,
      hospitals: currentData.hospitals.map((hospital) =>
        hospital.id === hospitalId ? { ...hospital, name } : hospital,
      ),
    }));
  };

  const updateKpiHospitalProduct = (
    hospitalId: number,
    productName: ProductName,
    value: number,
  ) => {
    setKpiData((currentData) => ({
      ...currentData,
      hospitals: currentData.hospitals.map((hospital) =>
        hospital.id === hospitalId
          ? {
              ...hospital,
              products: {
                ...hospital.products,
                [productName]: Math.max(0, value || 0),
              },
            }
          : hospital,
      ),
    }));
  };

  const changeKpiHospitalProduct = (
    hospitalId: number,
    productName: ProductName,
    amount: number,
  ) => {
    setKpiData((currentData) => ({
      ...currentData,
      hospitals: currentData.hospitals.map((hospital) =>
        hospital.id === hospitalId
          ? {
              ...hospital,
              products: {
                ...hospital.products,
                [productName]: Math.max(
                  0,
                  hospital.products[productName] + amount,
                ),
              },
            }
          : hospital,
      ),
    }));
  };

  const removeKpiHospital = (hospitalId: number) => {
    setKpiData((currentData) => ({
      ...currentData,
      hospitals: currentData.hospitals.filter(
        (hospital) => hospital.id !== hospitalId,
      ),
    }));
  };

  const applyHospitalTotalsToKpi = () => {
    setKpiData((currentData) => ({
      ...currentData,
      products: kpiProducts.reduce<Record<ProductName, KpiProductData>>(
        (acc, product) => {
          acc[product.name] = {
            ...currentData.products[product.name],
            actual: currentData.hospitals.reduce(
              (sum, hospital) => sum + hospital.products[product.name],
              0,
            ),
          };

          return acc;
        },
        {} as Record<ProductName, KpiProductData>,
      ),
    }));
  };

  const addSchedule = () => {
    const exists = newProfessor.schedules.some(
      (schedule) =>
        schedule.day === scheduleDay && schedule.period === schedulePeriod,
    );

    if (exists) return;

    setNewProfessor({
      ...newProfessor,
      schedules: [
        ...newProfessor.schedules,
        {
          day: scheduleDay,
          period: schedulePeriod,
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

  const isVisitedToday = (professorId: number, period: string) => {
    return (visitsByDate.get(todayDate) ?? []).some(
      (visit) =>
        visit.professorId === professorId &&
        visit.period === period,
    );
  };

  const getLastVisit = (professorId: number) => {
    return visitsByProfessor.get(professorId)?.[0];
  };

  const toggleVisit = (professorId: number, period: string) => {
    const exists = visits.find(
      (visit) =>
        visit.professorId === professorId &&
        visit.period === period &&
        visit.date === todayDate,
    );

    if (exists) {
      setVisits(
        visits.filter(
          (visit) =>
            !(
              visit.professorId === professorId &&
              visit.period === period &&
              visit.date === todayDate
            ),
        ),
      );
    } else {
      setVisits([
        ...visits,
        {
          professorId,
          period,
          date: todayDate,
          memo: "",
        },
      ]);
    }
  };

  const updateMemo = (professorId: number, period: string, memo: string) => {
    setVisits(
      visits.map((visit) => {
        if (
          visit.professorId === professorId &&
          visit.period === period &&
          visit.date === todayDate
        ) {
          return {
            ...visit,
            memo,
          };
        }

        return visit;
      }),
    );
  };

  const renderClinicCard = (item: Clinic) => {
    const visited = isVisitedToday(item.professor.id, item.period);
    const histories = visitsByProfessor.get(item.professor.id) ?? [];
    const lastVisit = histories[0];
    const todayVisit = (visitsByDate.get(todayDate) ?? []).find(
      (visit) =>
        visit.professorId === item.professor.id &&
        visit.period === item.period,
    );
    const historyKey = `${item.professor.id}-${item.period}`;
    const isHistoryExpanded = expandedHistoryKeys.has(historyKey);

    return (
      <div
        key={`${item.professor.id}-${item.period}`}
        className={`rounded-3xl border p-5 shadow-sm ${
          visited ? "border-green-500 bg-green-50" : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-xl font-bold">{item.professor.name}</div>

            <div className="text-sm text-gray-600">
              {item.professor.hospital}
            </div>

            <div className="mt-2 text-sm">{item.period} 외래</div>

            <div className="mt-3 text-sm font-medium">
              마지막 방문: {lastVisit ? lastVisit.date : "없음"}
            </div>

            <div className="mt-3 rounded-2xl bg-white p-3 text-sm">
              최근 메모: {lastVisit?.memo || "없음"}
            </div>

            {visited && (
              <div className="mt-3">
                <div className="mb-2 text-sm font-bold">방문 메모</div>

                <textarea
                  placeholder="교수님 반응 / 다음 액션 / 케이스 예정 등 입력"
                  value={todayVisit?.memo || ""}
                  onChange={(e) =>
                    updateMemo(
                      item.professor.id,
                      item.period,
                      e.target.value,
                    )
                  }
                  className="w-full rounded-2xl border p-3 text-sm"
                  rows={3}
                />
              </div>
            )}

            {histories.length > 0 && (
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
                    {histories.map((history, idx) => (
                      <div
                        key={`${history.date}-${history.period}-${idx}`}
                        className="rounded-2xl bg-white p-3 text-sm"
                      >
                        <div className="font-bold">{history.date}</div>

                        <div className="mt-1 text-gray-700">
                          {history.memo || "메모 없음"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => toggleVisit(item.professor.id, item.period)}
            className={`rounded-2xl px-4 py-3 text-sm font-bold text-white ${
              visited ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {visited ? "방문완료" : "방문체크"}
          </button>
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
          <div className="mb-5 text-3xl font-bold">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
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
                className="w-full rounded-2xl border p-3"
              />

              <div className="mt-3 flex gap-2 overflow-x-auto">
                {hospitals.map((hospital) => (
                  <button
                    key={hospital}
                    onClick={() => setHospitalFilter(hospital)}
                    className={`rounded-full px-4 py-2 text-sm ${
                      hospitalFilter === hospital
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {hospital}
                  </button>
                ))}
              </div>
            </div>

            {/* 오전 */}
            <div className="mb-6">
              <div className="mb-3 text-lg font-bold">오전 외래</div>

              <div className="space-y-4">
                {morningClinics.map(renderClinicCard)}
              </div>
            </div>

            {/* 오후 */}
            <div className="mb-6">
              <div className="mb-3 text-lg font-bold">오후 외래</div>

              <div className="space-y-4">
                {afternoonClinics.map(renderClinicCard)}
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
                        <div className="font-bold">{item.professor.name}</div>

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
                        <div className="font-bold">{item.professor.name}</div>

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

            <div className="mt-6 space-y-4">
              {/* 이번달 병원별 방문 통계 */}
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="mb-4 text-lg font-bold">이번달 병원별 방문</div>

                <div className="space-y-3">
                  {Object.entries(monthlyVisitCountsByHospital).map(([hospital, count]) => (
                    <div key={hospital}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{hospital}</span>

                        <span className="font-bold">{String(count)}회</span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(Number(count) * 10, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 마지막 방문 경과일 */}
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="mb-4 text-lg font-bold">마지막 방문 경과일</div>

                <div className="space-y-3">
                  {professors.map((professor) => {
                    const lastVisit = getLastVisit(professor.id);

                    let diffText = "방문 기록 없음";

                    let colorClass = "bg-gray-100 text-gray-700";

                    if (lastVisit) {
                      const diffDays = Math.floor(
                        (activeToday.getTime() -
                          parseDateKey(lastVisit.date).getTime()) /
                          (1000 * 60 * 60 * 24),
                      );

                      diffText = `${diffDays}일째 미방문`;

                      if (diffDays >= 14) {
                        colorClass = "bg-red-100 text-red-700";
                      } else if (diffDays >= 7) {
                        colorClass = "bg-orange-100 text-orange-700";
                      } else {
                        colorClass = "bg-green-100 text-green-700";
                      }
                    }

                    return (
                      <div
                        key={professor.id}
                        className="flex items-center justify-between rounded-2xl border p-4"
                      >
                        <div>
                          <div className="font-bold">{professor.name}</div>

                          <div className="text-sm text-gray-500">
                            {professor.hospital}
                          </div>
                        </div>

                        <div
                          className={`rounded-full px-3 py-2 text-sm font-bold ${colorClass}`}
                        >
                          {diffText}
                        </div>
                      </div>
                    );
                  })}
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
                className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-bold"
              >
                이전
              </button>

              <div className="text-center">
                <div className="text-2xl font-bold">
                  {calendarYear}년 {calendarMonth + 1}월
                </div>

                <div className="text-sm text-gray-500">방문 캘린더</div>
              </div>

              <button
                type="button"
                onClick={() => moveCalendarMonth(1)}
                className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-bold"
              >
                다음
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekdays.map((day) => (
                <div key={day} className="text-center text-sm font-bold">
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

                const previewSchedules = daySchedules.slice(0, 2);

                const hiddenCount = daySchedules.length - 2;

                const dayVisits = visitsByDate.get(dateString) ?? [];

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(dateString)}
                    className={`min-h-[140px] rounded-2xl border bg-gray-50 p-2 cursor-pointer ${
                      dateString === todayDate ? "border-2 border-blue-500" : ""
                    }`}
                  >
                    <div className="font-bold">{day}</div>

                    <div className="mt-2 space-y-1">
                      {previewSchedules.map((item, idx) => {
                        const visited = dayVisits.some(
                          (visit) =>
                            visit.professorId === item.professor.id &&
                            visit.period === item.period,
                        );

                        return (
                          <div
                            key={idx}
                            className={`rounded-lg px-2 py-1 text-[10px] ${
                              visited
                                ? "bg-green-500 text-white"
                                : "bg-gray-300"
                            }`}
                          >
                            {item.professor.name} {item.period}
                          </div>
                        );
                      })}

                      {hiddenCount > 0 && (
                        <div className="rounded-lg bg-gray-200 px-2 py-1 text-center text-[10px]">
                          +{hiddenCount}개
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6 rounded-3xl bg-gray-100 p-4">
                <div className="mb-1 text-lg font-bold">{selectedDate}</div>

                <div className="mb-4 text-sm text-gray-500">
                  선택한 날짜의 외래 목록
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
                        className="rounded-2xl bg-white p-4"
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

                  {selectedDateClinics.length === 0 && (
                    <div className="text-sm text-gray-500">
                      예정된 외래 없음
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPI */}
        {tab === "kpi" && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 text-xl font-bold">Sales KPI</div>

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
                className="mt-2 w-full rounded-2xl border p-3 text-center"
              />
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 text-lg font-bold">그룹 ASP</div>

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
                      className="w-full rounded-2xl border p-3 text-center"
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
                  <div className="mb-4 text-xl font-bold">{product.name}</div>

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
                        className="w-full rounded-2xl border p-3 text-center"
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
                        className="w-full rounded-2xl border p-3 text-center"
                      />
                    </label>

                    <div className="text-center text-sm">
                      <div className="mb-1 font-bold text-gray-600">Actual</div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeKpiActual(product.name, -1)}
                          className="rounded-xl bg-gray-200 px-3 py-3 font-bold"
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
                          className="min-w-0 flex-1 rounded-2xl border p-3 text-center"
                        />

                        <button
                          type="button"
                          onClick={() => changeKpiActual(product.name, 1)}
                          className="rounded-xl bg-gray-200 px-3 py-3 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-sm">
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
              <div className="mb-4 text-lg font-bold">그룹</div>

              <div className="space-y-3">
                {Object.entries(kpiSummary.groups).map(([name, group]) => (
                  <div key={name} className="rounded-2xl bg-gray-50 p-4">
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
              <div className="mb-4 text-xl font-bold">TOTAL KPI</div>

              <div className="rounded-2xl bg-gray-50 p-4 text-lg font-bold">
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

              <div className="mt-4 space-y-1 text-sm">
                <div>목표: ${formatCurrency(kpiSummary.totalTarget)}</div>
                <div>누적: ${formatCurrency(kpiSummary.totalRev)}</div>
                <div className="pt-2 text-base font-bold">
                  부족 매출: ${formatCurrency(kpiSummary.gap)}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm">
                <div className="mb-2 font-bold">
                  이번달 목표를 한 제품으로 채운다면
                </div>

                {(["ICD", "CRT-D", "IPG", "CRT-P"] as ProductName[]).map(
                  (name) => {
                    const asp = kpiData.products[name].asp;
                    const need = asp > 0 ? Math.ceil(kpiSummary.gap / asp) : 0;

                    return (
                      <div key={name}>
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

        {/* PROFESSOR */}
        {tab === "professor" && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 text-xl font-bold">외래 추가</div>

              <input
                value={newProfessor.name}
                onChange={(e) =>
                  setNewProfessor({
                    ...newProfessor,
                    name: e.target.value,
                  })
                }
                placeholder="교수님명"
                className="mb-3 w-full rounded-2xl border p-3"
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
                className="mb-3 w-full rounded-2xl border p-3"
              />

              <div className="mb-3 flex gap-2">
                <select
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(e.target.value)}
                  className="flex-1 rounded-2xl border p-3"
                >
                  {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
                    <option key={day}>{day}</option>
                  ))}
                </select>

                <select
                  value={schedulePeriod}
                  onChange={(e) => setSchedulePeriod(e.target.value)}
                  className="flex-1 rounded-2xl border p-3"
                >
                  <option>오전</option>

                  <option>오후</option>
                </select>
              </div>

              <button
                onClick={addSchedule}
                className="mb-4 w-full rounded-2xl bg-gray-200 p-3 font-bold"
              >
                외래 일정 추가
              </button>

              <div className="mb-4 flex flex-wrap gap-2">
                {newProfessor.schedules.map((schedule, idx) => (
                  <div
                    key={idx}
                    className="rounded-full bg-blue-100 px-3 py-2 text-sm"
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

            <div className="space-y-3">
              {professors.map((professor) => (
                <div
                  key={professor.id}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold">{professor.name}</div>

                      <div className="text-sm text-gray-500">
                        {professor.hospital}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {professor.schedules.map((schedule, idx) => (
                          <div
                            key={idx}
                            className="rounded-full bg-gray-200 px-3 py-1 text-sm"
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
          <div className="mx-auto flex max-w-md">
            <button
              onClick={() => setTab("home")}
              className={`flex-1 p-4 font-bold ${
                tab === "home" ? "text-blue-600" : "text-gray-500"
              }`}
            >
              홈
            </button>

            <button
              onClick={() => setTab("calendar")}
              className={`flex-1 p-4 font-bold ${
                tab === "calendar" ? "text-blue-600" : "text-gray-500"
              }`}
            >
              달력
            </button>

            <button
              onClick={() => setTab("kpi")}
              className={`flex-1 p-4 font-bold ${
                tab === "kpi" ? "text-blue-600" : "text-gray-500"
              }`}
            >
              KPI
            </button>

            <button
              onClick={() => setTab("professor")}
              className={`flex-1 p-4 font-bold ${
                tab === "professor" ? "text-blue-600" : "text-gray-500"
              }`}
            >
              외래관리
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
