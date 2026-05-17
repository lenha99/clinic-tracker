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

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export default function Home() {
  const [tab, setTab] = useState("home");

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [searchText, setSearchText] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("전체");

  const [selectedDate, setSelectedDate] = useState("");

  const [newProfessor, setNewProfessor] = useState({
    name: "",
    hospital: "",
    schedules: [] as Schedule[],
  });

  const [scheduleDay, setScheduleDay] = useState("월");
  const [schedulePeriod, setSchedulePeriod] = useState("오전");

  const today = new Date();

  const todayDay = weekdays[today.getDay()];

  const todayDate = today.toISOString().split("T")[0];

  const currentYear = today.getFullYear();

  const currentMonth = today.getMonth();

  useEffect(() => {
    const savedProfessors = localStorage.getItem("professors");
    const savedVisits = localStorage.getItem("visits");

    if (savedProfessors) {
      setProfessors(JSON.parse(savedProfessors));
    }

    if (savedVisits) {
      setVisits(JSON.parse(savedVisits));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "professors",
      JSON.stringify(professors)
    );
  }, [professors]);

  useEffect(() => {
    localStorage.setItem(
      "visits",
      JSON.stringify(visits)
    );
  }, [visits]);

  const hospitals = [
    "전체",
    ...new Set(
      professors
        .map((p) => p.hospital)
        .filter(Boolean)
    ),
  ];

  const formattedToday = `${today.getFullYear()}년 ${
    today.getMonth() + 1
  }월 ${today.getDate()}일 ${todayDay}요일`;

  const todaysClinics = useMemo(() => {
    return professors
      .flatMap((professor) =>
        professor.schedules
          .filter(
            (schedule) =>
              schedule.day === todayDay
          )
          .map((schedule) => ({
            professor,
            period: schedule.period,
          }))
      )
      .filter((item) => {
        const matchSearch =
          item.professor.name
            .toLowerCase()
            .includes(searchText.toLowerCase());

        const matchHospital =
          hospitalFilter === "전체" ||
          item.professor.hospital === hospitalFilter;

        return matchSearch && matchHospital;
      })
      .sort((a, b) => {
        if (
          a.period === "오전" &&
          b.period === "오후"
        )
          return -1;

        if (
          a.period === "오후" &&
          b.period === "오전"
        )
          return 1;

        return 0;
      });
  }, [
    professors,
    todayDay,
    searchText,
    hospitalFilter,
  ]);

  const morningClinics = todaysClinics.filter(
    (item) => item.period === "오전"
  );

  const afternoonClinics = todaysClinics.filter(
    (item) => item.period === "오후"
  );

  const addSchedule = () => {
    const exists = newProfessor.schedules.some(
      (schedule) =>
        schedule.day === scheduleDay &&
        schedule.period === schedulePeriod
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
    setProfessors(
      professors.filter(
        (professor) => professor.id !== id
      )
    );
  };

  const isVisitedToday = (
    professorId: number,
    period: string
  ) => {
    return visits.some(
      (visit) =>
        visit.professorId === professorId &&
        visit.period === period &&
        visit.date === todayDate
    );
  };

  const getLastVisit = (professorId: number) => {
    return visits
      .filter(
        (visit) =>
          visit.professorId === professorId
      )
      .sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )[0];
  };

  const toggleVisit = (
    professorId: number,
    period: string
  ) => {
    const exists = visits.find(
      (visit) =>
        visit.professorId === professorId &&
        visit.period === period &&
        visit.date === todayDate
    );

    if (exists) {
      setVisits(
        visits.filter(
          (visit) =>
            !(
              visit.professorId === professorId &&
              visit.period === period &&
              visit.date === todayDate
            )
        )
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

  const updateMemo = (
    professorId: number,
    period: string,
    memo: string
  ) => {
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
      })
    );
  };

  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      <div className="mx-auto max-w-md">

        <div className="mb-5 text-3xl font-bold">
          외래 방문 트래커
        </div>

        {/* HOME */}
        {tab === "home" && (
          <>
            <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">
                오늘 날짜
              </div>

              <div className="mt-1 text-xl font-bold">
                {formattedToday}
              </div>
            </div>

            <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
              <input
                value={searchText}
                onChange={(e) =>
                  setSearchText(e.target.value)
                }
                placeholder="교수 검색"
                className="w-full rounded-2xl border p-3"
              />

              <div className="mt-3 flex gap-2 overflow-x-auto">
                {hospitals.map((hospital) => (
                  <button
                    key={hospital}
                    onClick={() =>
                      setHospitalFilter(hospital)
                    }
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
              <div className="mb-3 text-lg font-bold">
                오전 외래
              </div>

              <div className="space-y-4">
                {morningClinics.map((item) => {
                  const visited =
                    isVisitedToday(
                      item.professor.id,
                      item.period
                    );

                  const lastVisit =
                    getLastVisit(
                      item.professor.id
                    );

                  const histories = visits
                    .filter(
                      (visit) =>
                        visit.professorId ===
                        item.professor.id
                    )
                    .sort(
                      (a, b) =>
                        new Date(
                          b.date
                        ).getTime() -
                        new Date(
                          a.date
                        ).getTime()
                    );

                  return (
                    <div
                      key={`${item.professor.id}-${item.period}`}
                      className={`rounded-3xl border p-5 shadow-sm ${
                        visited
                          ? "border-green-500 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">

                        <div className="flex-1">

                          <div className="text-xl font-bold">
                            {item.professor.name}
                          </div>

                          <div className="text-sm text-gray-600">
                            {item.professor.hospital}
                          </div>

                          <div className="mt-2 text-sm">
                            {item.period} 외래
                          </div>

                          <div className="mt-3 text-sm font-medium">
                            마지막 방문:{" "}
                            {lastVisit
                              ? lastVisit.date
                              : "없음"}
                          </div>

                          <div className="mt-3 rounded-2xl bg-white p-3 text-sm">
                            최근 메모:{" "}
                            {lastVisit?.memo ||
                              "없음"}
                          </div>

                          {visited && (
                            <div className="mt-3">
                              <div className="mb-2 text-sm font-bold">
                                방문 메모
                              </div>

                              <textarea
                                placeholder="교수님 반응 / 다음 액션 / 케이스 예정 등 입력"
                                value={
                                  visits.find(
                                    (visit) =>
                                      visit.professorId ===
                                        item.professor.id &&
                                      visit.period ===
                                        item.period &&
                                      visit.date ===
                                        todayDate
                                  )?.memo || ""
                                }
                                onChange={(e) =>
                                  updateMemo(
                                    item.professor.id,
                                    item.period,
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-2xl border p-3 text-sm"
                                rows={3}
                              />
                            </div>
                          )}

                          <div className="mt-4">
                            <div className="mb-2 text-sm font-bold">
                              메모 히스토리
                            </div>

                            <div className="space-y-2">
                              {histories
                                .slice(0, 5)
                                .map(
                                  (
                                    history,
                                    idx
                                  ) => (
                                    <div
                                      key={idx}
                                      className="rounded-2xl bg-white p-3 text-sm"
                                    >
                                      <div className="font-bold">
                                        {
                                          history.date
                                        }
                                      </div>

                                      <div className="mt-1 text-gray-700">
                                        {history.memo ||
                                          "메모 없음"}
                                      </div>
                                    </div>
                                  )
                                )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            toggleVisit(
                              item.professor.id,
                              item.period
                            )
                          }
                          className={`rounded-2xl px-4 py-3 text-sm font-bold text-white ${
                            visited
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        >
                          {visited
                            ? "방문완료"
                            : "방문체크"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 오후 */}
            <div className="mb-6">
              <div className="mb-3 text-lg font-bold">
                오후 외래
              </div>

              <div className="space-y-4">
                {afternoonClinics.map((item) => {
                  const visited =
                    isVisitedToday(
                      item.professor.id,
                      item.period
                    );

                  const lastVisit =
                    getLastVisit(
                      item.professor.id
                    );

                  const histories = visits
                    .filter(
                      (visit) =>
                        visit.professorId ===
                        item.professor.id
                    )
                    .sort(
                      (a, b) =>
                        new Date(
                          b.date
                        ).getTime() -
                        new Date(
                          a.date
                        ).getTime()
                    );

                  return (
                    <div
                      key={`${item.professor.id}-${item.period}`}
                      className={`rounded-3xl border p-5 shadow-sm ${
                        visited
                          ? "border-green-500 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">

                        <div className="flex-1">

                          <div className="text-xl font-bold">
                            {item.professor.name}
                          </div>

                          <div className="text-sm text-gray-600">
                            {item.professor.hospital}
                          </div>

                          <div className="mt-2 text-sm">
                            {item.period} 외래
                          </div>

                          <div className="mt-3 text-sm font-medium">
                            마지막 방문:{" "}
                            {lastVisit
                              ? lastVisit.date
                              : "없음"}
                          </div>

                          <div className="mt-3 rounded-2xl bg-white p-3 text-sm">
                            최근 메모:{" "}
                            {lastVisit?.memo ||
                              "없음"}
                          </div>

                          {visited && (
                            <div className="mt-3">
                              <div className="mb-2 text-sm font-bold">
                                방문 메모
                              </div>

                              <textarea
                                placeholder="교수님 반응 / 다음 액션 / 케이스 예정 등 입력"
                                value={
                                  visits.find(
                                    (visit) =>
                                      visit.professorId ===
                                        item.professor.id &&
                                      visit.period ===
                                        item.period &&
                                      visit.date ===
                                        todayDate
                                  )?.memo || ""
                                }
                                onChange={(e) =>
                                  updateMemo(
                                    item.professor.id,
                                    item.period,
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-2xl border p-3 text-sm"
                                rows={3}
                              />
                            </div>
                          )}

                          <div className="mt-4">
                            <div className="mb-2 text-sm font-bold">
                              메모 히스토리
                            </div>

                            <div className="space-y-2">
                              {histories
                                .slice(0, 5)
                                .map(
                                  (
                                    history,
                                    idx
                                  ) => (
                                    <div
                                      key={idx}
                                      className="rounded-2xl bg-white p-3 text-sm"
                                    >
                                      <div className="font-bold">
                                        {
                                          history.date
                                        }
                                      </div>

                                      <div className="mt-1 text-gray-700">
                                        {history.memo ||
                                          "메모 없음"}
                                      </div>
                                    </div>
                                  )
                                )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            toggleVisit(
                              item.professor.id,
                              item.period
                            )
                          }
                          className={`rounded-2xl px-4 py-3 text-sm font-bold text-white ${
                            visited
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        >
                          {visited
                            ? "방문완료"
                            : "방문체크"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 space-y-4">

  {/* 이번달 병원별 방문 통계 */}
  <div className="rounded-3xl bg-white p-5 shadow-sm">
    <div className="mb-4 text-lg font-bold">
      이번달 병원별 방문
    </div>

    <div className="space-y-3">
      {Object.entries(
        visits
          .filter((visit) => {
            const visitDate = new Date(
              visit.date
            );

            return (
              visitDate.getMonth() ===
                currentMonth &&
              visitDate.getFullYear() ===
                currentYear
            );
          })
          .reduce(
            (acc: any, visit) => {
              const professor =
                professors.find(
                  (p) =>
                    p.id ===
                    visit.professorId
                );

              if (!professor)
                return acc;

              const hospital =
                professor.hospital ||
                "미분류";

              acc[hospital] =
                (acc[hospital] || 0) +
                1;

              return acc;
            },
            {}
          )
      ).map(
        ([hospital, count]) => (
          <div key={hospital}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">
                {hospital}
              </span>

              <span className="font-bold">
                {String(count)}회
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(
                    Number(count) * 10,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )
      )}
    </div>
  </div>

  {/* 마지막 방문 경과일 */}
  <div className="rounded-3xl bg-white p-5 shadow-sm">
    <div className="mb-4 text-lg font-bold">
      마지막 방문 경과일
    </div>

    <div className="space-y-3">
      {professors.map((professor) => {
        const lastVisit = visits
          .filter(
            (visit) =>
              visit.professorId ===
              professor.id
          )
          .sort(
            (a, b) =>
              new Date(
                b.date
              ).getTime() -
              new Date(
                a.date
              ).getTime()
          )[0];

        let diffText =
          "방문 기록 없음";

        let colorClass =
          "bg-gray-100 text-gray-700";

        if (lastVisit) {
          const diffDays =
            Math.floor(
              (new Date().getTime() -
                new Date(
                  lastVisit.date
                ).getTime()) /
                (1000 *
                  60 *
                  60 *
                  24)
            );

          diffText = `${diffDays}일째 미방문`;

          if (diffDays >= 14) {
            colorClass =
              "bg-red-100 text-red-700";
          } else if (
            diffDays >= 7
          ) {
            colorClass =
              "bg-orange-100 text-orange-700";
          } else {
            colorClass =
              "bg-green-100 text-green-700";
          }
        }

        return (
          <div
            key={professor.id}
            className="flex items-center justify-between rounded-2xl border p-4"
          >
            <div>
              <div className="font-bold">
                {professor.name}
              </div>

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

            <div className="mb-2 text-2xl font-bold">
              {currentYear}년 {currentMonth + 1}월
            </div>

            <div className="mb-4 text-gray-500">
              방문 캘린더
            </div>

            <div className="grid grid-cols-7 gap-2">

              {weekdays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-bold"
                >
                  {day}
                </div>
              ))}

              {Array.from({
                length: daysInMonth,
              }).map((_, i) => {
                const day = i + 1;

                const dateString = `${currentYear}-${String(
                  currentMonth + 1
                ).padStart(2, "0")}-${String(
                  day
                ).padStart(2, "0")}`;

                const currentDate = new Date(
                  currentYear,
                  currentMonth,
                  day
                );

                const currentDay =
                  weekdays[currentDate.getDay()];

                const daySchedules =
                  professors.flatMap(
                    (professor) =>
                      professor.schedules
                        .filter(
                          (schedule) =>
                            schedule.day ===
                            currentDay
                        )
                        .map((schedule) => ({
                          professor,
                          period:
                            schedule.period,
                        }))
                  );

                const dayVisits = visits.filter(
                  (visit) =>
                    visit.date === dateString
                );

                return (
                  <div
                    key={day}
                    onClick={() =>
                      setSelectedDate(
                        dateString
                      )
                    }
                    className="min-h-[140px] rounded-2xl border bg-gray-50 p-2"
                  >
                    <div className="font-bold">
                      {day}
                    </div>

                    <div className="mt-2 space-y-1">

                      {daySchedules.map(
                        (item, idx) => {
                          const visited =
                            dayVisits.some(
                              (visit) =>
                                visit.professorId ===
                                  item.professor
                                    .id &&
                                visit.period ===
                                  item.period
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
                              {
                                item.professor
                                  .name
                              }{" "}
                              {item.period}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6 rounded-3xl bg-gray-100 p-4">

                <div className="mb-3 text-lg font-bold">
                  {selectedDate}
                </div>

                <div className="space-y-3">
                  {visits
                    .filter(
                      (visit) =>
                        visit.date ===
                        selectedDate
                    )
                    .map((visit, idx) => {
                      const professor =
                        professors.find(
                          (p) =>
                            p.id ===
                            visit.professorId
                        );

                      if (!professor)
                        return null;

                      return (
                        <div
                          key={idx}
                          className="rounded-2xl bg-white p-4"
                        >
                          <div className="font-bold">
                            {professor.name}
                          </div>

                          <div className="mt-1 text-sm">
                            {visit.period} 외래
                          </div>

                          <div className="mt-2 text-sm text-gray-700">
                            메모:{" "}
                            {visit.memo ||
                              "없음"}
                          </div>
                        </div>
                      );
                    })}

                  {visits.filter(
                    (visit) =>
                      visit.date ===
                      selectedDate
                  ).length === 0 && (
                    <div className="text-sm text-gray-500">
                      방문 기록 없음
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFESSOR */}
        {tab === "professor" && (
          <div className="space-y-4">

            <div className="rounded-3xl bg-white p-5 shadow-sm">

              <div className="mb-4 text-xl font-bold">
                교수 추가
              </div>

              <input
                value={newProfessor.name}
                onChange={(e) =>
                  setNewProfessor({
                    ...newProfessor,
                    name: e.target.value,
                  })
                }
                placeholder="교수명"
                className="mb-3 w-full rounded-2xl border p-3"
              />

              <input
                value={newProfessor.hospital}
                onChange={(e) =>
                  setNewProfessor({
                    ...newProfessor,
                    hospital:
                      e.target.value,
                  })
                }
                placeholder="병원명"
                className="mb-3 w-full rounded-2xl border p-3"
              />

              <div className="mb-3 flex gap-2">

                <select
                  value={scheduleDay}
                  onChange={(e) =>
                    setScheduleDay(
                      e.target.value
                    )
                  }
                  className="flex-1 rounded-2xl border p-3"
                >
                  {[
                    "월",
                    "화",
                    "수",
                    "목",
                    "금",
                    "토",
                    "일",
                  ].map((day) => (
                    <option key={day}>
                      {day}
                    </option>
                  ))}
                </select>

                <select
                  value={schedulePeriod}
                  onChange={(e) =>
                    setSchedulePeriod(
                      e.target.value
                    )
                  }
                  className="flex-1 rounded-2xl border p-3"
                >
                  <option>
                    오전
                  </option>

                  <option>
                    오후
                  </option>
                </select>
              </div>

              <button
                onClick={addSchedule}
                className="mb-4 w-full rounded-2xl bg-gray-200 p-3 font-bold"
              >
                외래 일정 추가
              </button>

              <div className="mb-4 flex flex-wrap gap-2">
                {newProfessor.schedules.map(
                  (schedule, idx) => (
                    <div
                      key={idx}
                      className="rounded-full bg-blue-100 px-3 py-2 text-sm"
                    >
                      {schedule.day}
                      요일 {schedule.period}
                    </div>
                  )
                )}
              </div>

              <button
                onClick={addProfessor}
                className="w-full rounded-2xl bg-blue-600 p-4 font-bold text-white"
              >
                교수 저장
              </button>
            </div>

            <div className="space-y-3">
              {professors.map(
                (professor) => (
                  <div
                    key={professor.id}
                    className="rounded-3xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">

                      <div>

                        <div className="text-lg font-bold">
                          {professor.name}
                        </div>

                        <div className="text-sm text-gray-500">
                          {professor.hospital}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {professor.schedules.map(
                            (
                              schedule,
                              idx
                            ) => (
                              <div
                                key={idx}
                                className="rounded-full bg-gray-200 px-3 py-1 text-sm"
                              >
                                {
                                  schedule.day
                                }
                                요일{" "}
                                {
                                  schedule.period
                                }
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          removeProfessor(
                            professor.id
                          )
                        }
                        className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* NAV */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white">

          <div className="mx-auto flex max-w-md">

            <button
              onClick={() =>
                setTab("home")
              }
              className={`flex-1 p-4 font-bold ${
                tab === "home"
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            >
              홈
            </button>

            <button
              onClick={() =>
                setTab("calendar")
              }
              className={`flex-1 p-4 font-bold ${
                tab === "calendar"
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            >
              달력
            </button>

            <button
              onClick={() =>
                setTab("professor")
              }
              className={`flex-1 p-4 font-bold ${
                tab === "professor"
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            >
              교수관리
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}