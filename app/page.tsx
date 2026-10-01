"use client";

import { useEffect, useMemo, useState } from "react";
import type { CharacterProfile } from "@/types/character";
import type { StudyPlan } from "@/types/study";
import type { UserProfile } from "@/types/user";
import { getCharacterProfile, getStudyPlans, getUserProfile } from "@/lib/storage";

const themeIds = [
  "sakura",
  "lavender",
  "forest",
  "baby-blue",
  "cream-yellow",
  "calm-red",
  "cream-white",
  "deep-blue",
] as const;

function isThemeId(value: string | null): value is (typeof themeIds)[number] {
  return themeIds.includes(value as (typeof themeIds)[number]);
}

function formatStudyDuration(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} 小时` : `${hours} 小时 ${minutes} 分钟`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysFromMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start: formatDate(start), end: formatDate(end) };
}

function formatPlanStatus(status: StudyPlan["status"]): string {
  if (status === "completed") return "已完成";
  if (status === "in_progress") return "进行中";
  if (status === "cancelled") return "已取消";
  return "待学习";
}

export default function Home() {
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedCharacter = getCharacterProfile();
      const savedUser = getUserProfile();
      setCharacterProfile(savedCharacter);
      setUserProfile(savedUser);
      setStudyPlans(getStudyPlans());
      setIsFirstTime(!savedCharacter && !savedUser);
      const savedTheme = window.localStorage.getItem("oc-study-theme");
      document.documentElement.dataset.theme = isThemeId(savedTheme)
        ? savedTheme
        : "sakura";
      setIsDataLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const characterName = characterProfile?.name?.trim() || "未设置 OC";
  const homeCharacterImage = characterProfile?.characterImage ?? characterProfile?.avatar;
  const userName = userProfile?.name?.trim() || "你";
  const userAvatar = userProfile?.avatar;
  const totalStudyMinutes = useMemo(
    () =>
      studyPlans
        .filter((plan) => plan.status === "completed")
        .reduce(
          (total, plan) =>
            total + (Number.isFinite(plan.actualDuration) ? plan.actualDuration : 0),
          0,
        ),
    [studyPlans],
  );
  const today = formatDate(new Date());
  const todayPlans = useMemo(
    () =>
      studyPlans
        .filter((plan) => plan.date === today)
        .sort((firstPlan, secondPlan) =>
          firstPlan.startTime.localeCompare(secondPlan.startTime),
        ),
    [studyPlans, today],
  );
  const completedTodayCount = todayPlans.filter(
    (plan) => plan.status === "completed",
  ).length;
  const nextPlan = todayPlans.find(
    (plan) =>
      plan.status !== "completed" &&
      plan.status !== "cancelled" &&
      plan.startTime > new Date().toTimeString().slice(0, 5),
  );
  const { start: weekStart, end: weekEnd } = getWeekRange(new Date());
  const weeklyPlans = useMemo(
    () => studyPlans.filter((plan) => plan.date >= weekStart && plan.date <= weekEnd),
    [studyPlans, weekStart, weekEnd],
  );
  const completedWeeklyPlans = weeklyPlans.filter(
    (plan) => plan.status === "completed",
  );
  const weeklyCompletionRate = weeklyPlans.length
    ? Math.round((completedWeeklyPlans.length / weeklyPlans.length) * 100)
    : 0;
  const weeklyStudyMinutes = completedWeeklyPlans.reduce(
    (total, plan) =>
      total + (Number.isFinite(plan.actualDuration) ? plan.actualDuration : 0),
    0,
  );

  if (!isDataLoaded) {
    return (
      <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
        <div className="mx-auto max-w-3xl text-sm text-[var(--app-secondary-text)]">正在加载...</div>
      </main>
    );
  }

  if (isFirstTime) {
    return (
      <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-accent)]">
            OC companion
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            创建属于你的 OC 学习搭子
          </h1>
          <p className="mt-5 max-w-lg leading-7 text-[var(--app-secondary-text)]">
            让你喜欢的角色陪你学习、提醒你坚持，也可以按照你的设定和语气陪伴你。
          </p>
          <div className="mt-9 grid w-full max-w-xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-4">
              <p className="font-semibold text-[var(--app-primary)]">自定义 OC</p>
              <p className="mt-2 text-sm leading-6 text-[var(--app-secondary-text)]">设置角色名字、形象和人格</p>
            </div>
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-4">
              <p className="font-semibold text-[var(--app-primary)]">个性化陪伴</p>
              <p className="mt-2 text-sm leading-6 text-[var(--app-secondary-text)]">设置角色的语言风格和说话方式</p>
            </div>
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-4">
              <p className="font-semibold text-[var(--app-primary)]">学习计划</p>
              <p className="mt-2 text-sm leading-6 text-[var(--app-secondary-text)]">创建学习任务，并在学习过程中获得 OC 陪伴</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-[var(--app-primary)] px-6 py-3 text-sm font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]"
              href="/oc"
            >
              开始创建我的 OC
            </a>
            <a
              className="rounded-full border border-[var(--app-accent)] px-6 py-3 text-sm font-semibold text-[var(--app-primary-hover)] transition hover:bg-[var(--app-accent-soft)]"
              href="/user"
            >
              设置我的信息
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-8 text-[var(--app-main-text)] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-[var(--app-border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-accent)]">
              Study with your OC
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--app-main-text)] sm:text-5xl">
              早上好，今天也一起学习吧。
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[var(--app-secondary-text)]">
              让你的原创角色陪你完成今天的小目标，慢慢积累也会变成很远的路。
            </p>
          </div>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[1.1fr_0.9fr]" aria-label="学习概览">
          <div className="rounded-[2rem] bg-[var(--app-soft-background)] p-7 sm:p-9">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-[var(--app-accent)]">你的 OC 陪伴中</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--app-primary)]">
                  {characterName}
                </h2>
                <p className="mt-3 max-w-sm leading-7 text-[var(--app-secondary-text)]">
                  “先从最容易的一步开始，我会在这里等你完成。”
                </p>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--app-accent-soft)] text-4xl shadow-sm" aria-label={`${characterName}的头像`}>
                {homeCharacterImage ? (
                  <img className="h-full w-full object-cover" src={homeCharacterImage} alt={`${characterName}的头像`} />
                ) : (
                  "✦"
                )}
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-background)] px-4 py-3 text-sm">
              <p className="text-[var(--app-muted-text)]">学习陪伴</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-main-text)]">
                {isDataLoaded
                  ? totalStudyMinutes > 0
                    ? `${characterName}已经陪伴${userName}学习 ${totalStudyMinutes} 分钟`
                    : `${characterName}期待陪${userName}开始第一次学习`
                  : "正在读取..."}
              </p>
            </div>
            <div className="relative mt-8 flex items-center justify-center gap-8 rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)]/60 px-5 py-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-2xl text-[var(--app-accent)]">
                  {characterProfile?.avatar || characterProfile?.characterImage ? (
                    <img
                      className="h-full w-full object-cover"
                      src={characterProfile.avatar || characterProfile.characterImage || ""}
                      alt={`${characterName}头像`}
                    />
                  ) : "✦"}
                </div>
                <span className="max-w-24 truncate text-xs font-medium text-[var(--app-primary)]">{characterName}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-[var(--app-accent)]" aria-hidden="true">
                <svg className="h-8 w-20" viewBox="0 0 80 32" fill="none">
                  <defs>
                    <marker
                      id="arrowhead"
                      viewBox="0 0 8 8"
                      refX="0"
                      refY="4"
                      markerWidth="4"
                      markerHeight="4"
                      orient="auto-start-reverse"
                    >
                      <path d="M0 0 L 8 4 L 0 8 Z" fill="currentColor" />
                    </marker>
                  </defs>
                  <path
                    d="M4 21 C 20 7, 50 7, 66 17"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    markerEnd="url(#arrowhead)"
                  />
                  <path d="M39 11C37.5 8.5 33 9.5 34.5 12.5C36 15 39 16.5 39 16.5C39 16.5 42 15 43.5 12.5C45 9.5 40.5 8.5 39 11Z" fill="var(--app-accent-soft)" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="text-xs">陪伴</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-xl text-[var(--app-accent)]">
                  {userAvatar ? <img className="h-full w-full object-cover" src={userAvatar} alt={`${userName}头像`} /> : "♡"}
                </div>
                <span className="max-w-24 truncate text-xs font-medium text-[var(--app-primary)]">{userName}</span>
              </div>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <a className="rounded-full bg-[var(--app-primary)] px-5 py-3 text-sm font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]" href="#tasks">
                查看今日计划
              </a>
              <a className="rounded-full border border-[var(--app-accent)] px-5 py-3 text-sm font-semibold text-[var(--app-primary-hover)] transition hover:bg-[var(--app-accent-soft)]" href="#companion">
                和{characterName}说说话
              </a>
            </div>
          </div>

          <div id="companion" className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-card-background)] p-7 sm:p-9">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">本周小记录</h2>
              <span className="rounded-full bg-[var(--app-success-background)] px-3 py-1 text-xs font-semibold text-[var(--app-success-text)]">状态不错</span>
            </div>
            <div className="mt-8 flex items-end gap-3">
              <p className="text-5xl font-semibold tracking-tight text-[var(--app-primary)]">
                {weeklyCompletionRate}%
              </p>
              <p className="pb-2 text-sm text-[var(--app-muted-text)]">本周完成度</p>
            </div>
            <div
              className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--app-progress-background)]"
              aria-label={`本周计划完成度 ${weeklyCompletionRate}%`}
            >
              <div
                className="h-full rounded-full bg-[var(--app-progress)]"
                style={{ width: `${weeklyCompletionRate}%` }}
              />
            </div>
            <p className="mt-5 text-sm leading-6 text-[var(--app-secondary-text)]">
              本周完成 {completedWeeklyPlans.length} 个计划，累计学习 {formatStudyDuration(weeklyStudyMinutes)}。
            </p>
          </div>
        </section>

        <section id="tasks" className="grid gap-6 pb-10 lg:grid-cols-[1.35fr_0.65fr]" aria-label="今日学习计划">
          <div className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-card-background)] p-7 sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--app-muted-text)]">{today}</p>
                <h2 className="mt-1 text-2xl font-semibold">今日学习计划</h2>
              </div>
              <span className="text-sm font-medium text-[var(--app-accent)]">
                {todayPlans.length ? `${completedTodayCount} / ${todayPlans.length} 完成` : "今天暂无计划"}
              </span>
            </div>
            <div className="mt-7 space-y-3">
              {todayPlans.length ? todayPlans.map((plan) => (
                <div
                  className={`flex items-center gap-4 rounded-2xl border p-4 ${plan.status === "completed" ? "border-[var(--app-border)] bg-[var(--app-accent-soft)]" : "border-[var(--app-border)]"}`}
                  key={plan.id}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${plan.status === "completed" ? "bg-[var(--app-progress)] text-[var(--app-card-background)]" : "border-2 border-[var(--app-accent)]"}`}>
                    {plan.status === "completed" ? "✓" : ""}
                  </span>
                  <div className="flex-1">
                    <p className={`font-medium ${plan.status === "completed" ? "line-through decoration-[var(--app-muted-text)]" : ""}`}>
                      {plan.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--app-muted-text)]">
                      {plan.startTime} · 学习 {plan.duration} 分钟 · 休息 {plan.breakDuration} 分钟
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[var(--app-accent)]">{formatPlanStatus(plan.status)}</span>
                </div>
              )) : (
                <p className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-card-background)] p-5 text-sm text-[var(--app-muted-text)]">
                  今天还没有学习计划
                </p>
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] bg-[var(--app-accent-soft)] p-7 sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--app-accent)]">下一次提醒</p>
            <h2 className="mt-3 text-4xl font-semibold text-[var(--app-primary)]">
              {nextPlan ? nextPlan.startTime : "暂无"}
            </h2>
            <p className="mt-2 leading-7 text-[var(--app-secondary-text)]">
              {nextPlan ? `${nextPlan.title} · ${nextPlan.duration} 分钟` : "今天没有待开始的计划"}
            </p>
            <div className="mt-10 border-t border-[var(--app-border)] pt-5">
              <p className="text-sm leading-6 text-[var(--app-secondary-text)]">{characterName}会在提醒时出现，陪你开启这一小段专注时间。</p>
            </div>
          </aside>
        </section>

      </div>
      </main>
  );
}
