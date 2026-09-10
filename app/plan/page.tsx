"use client";

import { useEffect, useMemo, useState } from "react";
import type { CharacterProfile, CharacterStyle } from "@/types/character";
import type { StudyPlan } from "@/types/study";
import type { UserProfile } from "@/types/user";
import {
  getCharacterProfile,
  getStudyPlans,
  getUserProfile,
  saveStudyPlans,
} from "@/lib/storage";

type PlanForm = {
  title: string;
  startTime: string;
  duration: string;
  breakDuration: string;
};

type TimerMode = "countdown" | "elapsed";

const initialForm: PlanForm = {
  title: "",
  startTime: "19:00",
  duration: "60",
  breakDuration: "10",
};

function createFormFromPlan(plan: StudyPlan): PlanForm {
  return {
    title: plan.title,
    startTime: plan.startTime,
    duration: String(plan.duration),
    breakDuration: String(plan.breakDuration),
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createPlanId(): string {
  return crypto.randomUUID();
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getCurrentTimestamp(): number {
  return Date.now();
}

function getStyleSamples(
  profile: CharacterProfile | null,
  style: CharacterStyle,
): string[] {
  const rawSamples: unknown = profile?.styleSamples?.[style];

  if (Array.isArray(rawSamples)) {
    return rawSamples
      .filter((sample): sample is string => typeof sample === "string")
      .map((sample) => sample.trim())
      .filter(Boolean);
  }

  return typeof rawSamples === "string" && rawSamples.trim()
    ? [rawSamples.trim()]
    : [];
}

function getCompanionLine(
  profile: CharacterProfile | null,
  userProfile: UserProfile | null,
  elapsedSeconds: number,
): string {
  const formalName = userProfile?.name?.trim() || "你";
  const nickname = userProfile?.nickname?.trim() || formalName;
  const userAddress = profile?.userAddress?.trim() || formalName;
  const fallbackLines = [
    `开始吧，${userAddress}，我会陪着你。`,
    `${nickname}，已经坚持一会儿了，保持这个节奏。`,
    `再专注一下${userAddress}，你做得很好。`,
    `别急，按自己的节奏继续就好，${formalName}。`,
    `今天也认真完成了一段学习，${formalName}。`,
  ];
  const thresholds = [0, 300, 900, 1500, 2400];
  const checkpointIndex = Math.min(
    thresholds.filter((threshold) => elapsedSeconds >= threshold).length - 1,
    fallbackLines.length - 1,
  );
  const stylesByCheckpoint: CharacterStyle[] = [
    "encouragement",
    "casual",
    "praise",
    "comfort",
    "coquettish",
  ];
  const currentStyle = stylesByCheckpoint[checkpointIndex];
  const samples = getStyleSamples(profile, currentStyle);

  if (samples.length > 0) {
    return samples[checkpointIndex % samples.length]
      .replaceAll("{name}", formalName)
      .replaceAll("{nickname}", nickname)
      .replaceAll("{userAddress}", userAddress);
  }

  return fallbackLines[checkpointIndex];
}

function getEndingLine(
  profile: CharacterProfile | null,
  userProfile: UserProfile | null,
): string {
  const formalName = userProfile?.name?.trim() || "你";
  return (
    getStyleSamples(profile, "serious")[0]
      ?.replaceAll("{name}", formalName)
      .replaceAll("{nickname}", userProfile?.nickname?.trim() || formalName)
      .replaceAll("{userAddress}", profile?.userAddress?.trim() || formalName) ||
    `${formalName}，今天辛苦了，学习到这里吧。`
  );
}

export default function StudyPlanPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [form, setForm] = useState<PlanForm>(initialForm);
  const [isLoaded, setIsLoaded] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeStartTime, setActiveStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedPlanId, setCompletedPlanId] = useState<string | null>(null);
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0);
  const [isCompanionMode, setIsCompanionMode] = useState(false);
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDurationReached, setIsDurationReached] = useState(false);
  const [isEndingStudy, setIsEndingStudy] = useState(false);
  const [endingLine, setEndingLine] = useState("");
  const [timerMode, setTimerMode] = useState<TimerMode>("countdown");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedDate(formatDate(new Date()));
      setPlans(getStudyPlans());
      setUserProfile(getUserProfile());
      document.documentElement.dataset.theme = window.localStorage.getItem("oc-study-theme") || "sakura";
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (activeStartTime === null) {
      return;
    }

    const updateElapsedTime = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - activeStartTime) / 1000));
      setElapsedSeconds(elapsed);

      const activePlan = plans.find((plan) => plan.id === activePlanId);
      if (activePlan && elapsed >= activePlan.duration * 60) {
        setIsDurationReached(true);
      }
    };

    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);

    return () => window.clearInterval(intervalId);
  }, [activePlanId, activeStartTime, plans]);

  useEffect(() => {
    if (!isEndingStudy || activePlanId === null || activeStartTime === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const endTimestamp = getCurrentTimestamp();
      const finalElapsedSeconds = Math.max(
        0,
        Math.floor((endTimestamp - activeStartTime) / 1000),
      );
      const nextPlans = plans.map((plan) =>
        plan.id === activePlanId
          ? {
              ...plan,
              status: "completed" as const,
              actualEndTime: new Date(endTimestamp).toISOString(),
              actualDuration: Math.max(1, Math.ceil(finalElapsedSeconds / 60)),
            }
          : plan,
      );

      saveStudyPlans(nextPlans);
      setPlans(nextPlans);
      setElapsedSeconds(finalElapsedSeconds);
      setCompletedElapsedSeconds(finalElapsedSeconds);
      setCompletedPlanId(activePlanId);
      setActivePlanId(null);
      setActiveStartTime(null);
      setIsCompanionMode(false);
      setIsDurationReached(false);
      setIsEndingStudy(false);
      setFormMessage("本次学习已完成");
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [activePlanId, activeStartTime, isEndingStudy, plans]);

  const selectedPlans = useMemo(
    () =>
      plans
        .filter((plan) => plan.date === selectedDate)
        .sort((firstPlan, secondPlan) =>
          firstPlan.startTime.localeCompare(secondPlan.startTime),
        ),
    [plans, selectedDate],
  );

  function updateForm(field: keyof PlanForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFormMessage("");
  }

  function validateForm(duration: number, breakDuration: number): boolean {
    if (!form.title.trim()) {
      setFormMessage("请先填写学习内容");
      return false;
    }

    if (!selectedDate || !form.startTime || duration <= 0 || breakDuration < 0) {
      setFormMessage("请填写有效的时间和时长");
      return false;
    }

    return true;
  }

  function resetForm() {
    setForm(initialForm);
    setEditingPlanId(null);
  }

  function handleSavePlan() {
    const duration = Number(form.duration);
    const breakDuration = Number(form.breakDuration);

    if (!validateForm(duration, breakDuration)) {
      return;
    }

    if (editingPlanId) {
      const nextPlans = plans.map((plan) =>
        plan.id === editingPlanId
          ? {
              ...plan,
              title: form.title.trim(),
              startTime: form.startTime,
              duration,
              breakDuration,
            }
          : plan,
      );

      saveStudyPlans(nextPlans);
      setPlans(nextPlans);
      resetForm();
      setFormMessage("计划已更新");
      return;
    }

    const newPlan: StudyPlan = {
      id: createPlanId(),
      date: selectedDate,
      title: form.title.trim(),
      startTime: form.startTime,
      duration,
      breakDuration,
      status: "planned",
      actualStartTime: null,
      actualEndTime: null,
      actualDuration: 0,
    };
    const nextPlans = [...plans, newPlan];

    saveStudyPlans(nextPlans);
    setPlans(nextPlans);
    setForm((currentForm) => ({ ...currentForm, title: "" }));
    setFormMessage("计划已添加");
  }

  function handleEditPlan(plan: StudyPlan) {
    setEditingPlanId(plan.id);
    setForm(createFormFromPlan(plan));
    setFormMessage("");
  }

  function handleDeletePlan(planId: string) {
    if (!window.confirm("确定要删除这个学习计划吗？")) {
      return;
    }

    const nextPlans = plans.filter((plan) => plan.id !== planId);
    saveStudyPlans(nextPlans);
    setPlans(nextPlans);

    if (editingPlanId === planId) {
      resetForm();
    }

    if (activePlanId === planId) {
      setActivePlanId(null);
      setActiveStartTime(null);
      setElapsedSeconds(0);
      setIsCompanionMode(false);
      setIsDurationReached(false);
      setIsEndingStudy(false);
      setEndingLine("");
    }

    if (completedPlanId === planId) {
      setCompletedPlanId(null);
      setCompletedElapsedSeconds(0);
    }

    setFormMessage("计划已删除");
  }

  function handleStartPlan(planId: string) {
    if (activePlanId !== null) {
      setFormMessage("请先结束当前学习计划。");
      return;
    }

    const startTimestamp = getCurrentTimestamp();
    const nextPlans = plans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            status: "in_progress" as const,
            actualStartTime: new Date(startTimestamp).toISOString(),
          }
        : plan,
    );

    saveStudyPlans(nextPlans);
    setPlans(nextPlans);
    setCharacterProfile(getCharacterProfile());
    setUserProfile(getUserProfile());
    setActivePlanId(planId);
    setActiveStartTime(startTimestamp);
    setElapsedSeconds(0);
    setCompletedPlanId(null);
    setCompletedElapsedSeconds(0);
    setIsCompanionMode(true);
    setIsDurationReached(false);
    setIsEndingStudy(false);
    setEndingLine("");
    setFormMessage("");
  }

  function handleEndPlan(planId: string) {
    if (
      activePlanId !== planId ||
      activeStartTime === null ||
      isEndingStudy
    ) {
      return;
    }

    setEndingLine(getEndingLine(characterProfile, userProfile));
    setIsEndingStudy(true);
    setIsDurationReached(false);
  }

  function handleContinueStudy() {
    setIsDurationReached(false);
    setFormMessage("");
  }

  const activePlan = activePlanId
    ? plans.find((plan) => plan.id === activePlanId) ?? null
    : null;
  const displayedTimerSeconds = activePlan && timerMode === "countdown"
    ? Math.max(0, activePlan.duration * 60 - elapsedSeconds)
    : elapsedSeconds;

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
        <div className="mx-auto max-w-3xl text-sm text-[var(--app-secondary-text)]">正在加载学习计划...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--app-accent)]">
            Study plans
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">学习计划</h1>
          <p className="mt-3 leading-7 text-[var(--app-secondary-text)]">
            先安排好今天要完成的事情，之后让 OC 陪你一步一步完成。
          </p>
        </header>

        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-6 shadow-sm sm:p-8">
          <label className="block text-sm font-medium" htmlFor="plan-date">
            选择日期
          </label>
          <input
            id="plan-date"
            className="mt-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">
            {editingPlanId ? "编辑学习计划" : "添加学习计划"}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">
              学习内容
              <input
                className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="例如：英国文学：Victorian Novel"
              />
            </label>
            <label className="text-sm font-medium">
              开始时间
              <input
                className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                type="time"
                value={form.startTime}
                onChange={(event) => updateForm("startTime", event.target.value)}
              />
            </label>
            <label className="text-sm font-medium">
              预计学习时长（分钟）
              <input
                className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                type="number"
                min="1"
                value={form.duration}
                onChange={(event) => updateForm("duration", event.target.value)}
              />
            </label>
            <label className="text-sm font-medium">
              休息时间（分钟）
              <input
                className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                type="number"
                min="0"
                value={form.breakDuration}
                onChange={(event) => updateForm("breakDuration", event.target.value)}
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              className="rounded-full bg-[var(--app-primary)] px-6 py-3 text-sm font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]"
              type="button"
              onClick={handleSavePlan}
            >
              {editingPlanId ? "保存修改" : "添加计划"}
            </button>
            {editingPlanId && (
              <button
                className="rounded-full border border-[var(--app-border)] px-6 py-3 text-sm font-semibold text-[var(--app-primary)] transition hover:bg-[var(--app-accent-soft)]"
                type="button"
                onClick={() => {
                  resetForm();
                  setFormMessage("");
                }}
              >
                取消编辑
              </button>
            )}
            <p className="text-sm font-medium text-[var(--app-success-text)]" aria-live="polite">
              {formMessage}
            </p>
          </div>
        </section>

        <section className="mt-6 pb-8" aria-live="polite">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--app-muted-text)]">{selectedDate}</p>
              <h2 className="mt-1 text-2xl font-semibold">当天计划</h2>
            </div>
            <span className="text-sm text-[var(--app-muted-text)]">{selectedPlans.length} 项</span>
          </div>
          {activePlanId && (
            <div className="mt-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-soft-background)] p-4 text-sm text-[var(--app-primary)]">
              正在学习：{plans.find((plan) => plan.id === activePlanId)?.title ?? "当前计划"}
              <span className="ml-2 font-semibold">{formatElapsedTime(elapsedSeconds)}</span>
            </div>
          )}
          <div className="mt-5 space-y-3">
            {selectedPlans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-background)] p-6 text-sm text-[var(--app-muted-text)]">
                这一天还没有学习计划。
              </div>
            ) : (
              selectedPlans.map((plan) => (
                <article
                  className="flex flex-col gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-5 shadow-sm sm:flex-row sm:items-center"
                  key={plan.id}
                >
                  <time className="text-2xl font-semibold text-[var(--app-accent)]" dateTime={`${plan.date}T${plan.startTime}`}>
                    {plan.startTime}
                  </time>
                  <div className="flex-1">
                    <h3 className="font-semibold">{plan.title}</h3>
                    <p className="mt-1 text-sm text-[var(--app-secondary-text)]">
                      学习 {plan.duration} 分钟 · 休息 {plan.breakDuration} 分钟
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {activePlanId === plan.id ? (
                      <span className="rounded-full bg-[var(--app-progress)] px-3 py-1 text-xs font-semibold text-[var(--app-card-background)]">
                        学习中 {formatElapsedTime(elapsedSeconds)}
                      </span>
                    ) : completedPlanId === plan.id ? (
                      <span className="rounded-full bg-[var(--app-success-background)] px-3 py-1 text-xs font-medium text-[var(--app-success-text)]">
                        已完成 · {formatElapsedTime(completedElapsedSeconds)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--app-accent)]">
                        待学习
                      </span>
                    )}
                    {activePlanId === plan.id ? (
                      <button
                        className="rounded-full bg-[var(--app-primary)] px-3 py-1 text-xs font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]"
                        type="button"
                        onClick={() => handleEndPlan(plan.id)}
                      >
                        结束学习
                      </button>
                    ) : (
                      <button
                        className="rounded-full border border-[var(--app-border)] px-3 py-1 text-xs font-medium text-[var(--app-primary)] transition hover:bg-[var(--app-accent-soft)]"
                        type="button"
                        onClick={() => handleStartPlan(plan.id)}
                      >
                        开始学习
                      </button>
                    )}
                    <button
                      className="rounded-full border border-[var(--app-border)] px-3 py-1 text-xs font-medium text-[var(--app-primary)] transition hover:bg-[var(--app-accent-soft)]"
                      type="button"
                      onClick={() => handleEditPlan(plan)}
                    >
                      编辑
                    </button>
                    <button
                      className="rounded-full border border-[var(--app-border)] px-3 py-1 text-xs font-medium text-[var(--app-accent)] transition hover:bg-[var(--app-accent-soft)]"
                      type="button"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
      {isCompanionMode && activePlanId && (
        <section
          className="fixed inset-0 z-[60] flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--app-primary)] px-5 py-6 text-[var(--app-card-background)]"
          role="dialog"
          aria-modal="true"
          aria-label="OC 陪伴学习模式"
        >
          <div className="flex items-center justify-between text-sm text-[var(--app-accent-soft)]">
            <span>{characterProfile?.name || "你的 OC"} 陪伴中</span>
            <span>{plans.find((plan) => plan.id === activePlanId)?.title}</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-6">
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              {characterProfile?.characterImage ? (
                <img
                  className="max-h-full max-w-full object-contain"
                  src={characterProfile.characterImage}
                  alt={`${characterProfile.name || "OC"} 的角色图片`}
                />
              ) : (
                <div className="flex h-full max-h-[55dvh] w-full max-w-sm items-center justify-center rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-soft-background)] px-8 text-center text-sm leading-7 text-[var(--app-main-text)]">
                  还没有设置 OC 图片，请先前往 OC 页面设置。
                </div>
              )}
            </div>
            <p
              key={`${activePlanId}-${isEndingStudy ? "ending" : Math.floor(elapsedSeconds / 5)}`}
              className="max-w-sm text-center text-lg leading-8 text-[var(--app-card-background)] transition-opacity duration-500"
            >
              “{isEndingStudy ? endingLine : getCompanionLine(characterProfile, userProfile, elapsedSeconds)}”
            </p>
            <div className="text-center">
              <div className="mb-3 flex justify-center gap-2" role="group" aria-label="计时显示模式">
                <button
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${timerMode === "countdown" ? "bg-[var(--app-soft-background)] text-[var(--app-primary)]" : "text-[var(--app-accent-soft)] hover:bg-[var(--app-primary-hover)]"}`}
                  type="button"
                  onClick={() => setTimerMode("countdown")}
                  aria-pressed={timerMode === "countdown"}
                >
                  倒计时
                </button>
                <button
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${timerMode === "elapsed" ? "bg-[var(--app-soft-background)] text-[var(--app-primary)]" : "text-[var(--app-accent-soft)] hover:bg-[var(--app-primary-hover)]"}`}
                  type="button"
                  onClick={() => setTimerMode("elapsed")}
                  aria-pressed={timerMode === "elapsed"}
                >
                  正计时
                </button>
              </div>
              <p className="text-4xl font-semibold tracking-[0.08em]">
                {formatElapsedTime(displayedTimerSeconds)}
              </p>
              {isEndingStudy ? (
                <p className="mt-5 text-sm text-[var(--app-accent-soft)]">正在保存本次学习...</p>
              ) : isDurationReached ? (
                <div className="mt-5 space-y-3">
                  <p className="text-base font-semibold text-[var(--app-soft-background)]">学习时间到了</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      className="min-h-12 rounded-full border border-[var(--app-border)] px-6 py-3 text-base font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]"
                      type="button"
                      onClick={handleContinueStudy}
                    >
                      继续学习
                    </button>
                    <button
                      className="min-h-12 rounded-full bg-[var(--app-soft-background)] px-6 py-3 text-base font-semibold text-[var(--app-primary)] transition hover:bg-[var(--app-accent-soft)]"
                      type="button"
                      onClick={() => handleEndPlan(activePlanId)}
                    >
                      结束学习
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="mt-5 min-h-12 rounded-full bg-[var(--app-soft-background)] px-8 py-3 text-base font-semibold text-[var(--app-primary)] transition hover:bg-[var(--app-accent-soft)]"
                  type="button"
                  onClick={() => handleEndPlan(activePlanId)}
                >
                  结束学习
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
