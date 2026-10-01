"use client";

import { ChangeEvent, useEffect, useState } from "react";
import type { UserProfile } from "@/types/user";
import { getUserProfile, saveUserProfile } from "@/lib/storage";

type ThemeId =
  | "sakura"
  | "lavender"
  | "forest"
  | "baby-blue"
  | "cream-yellow"
  | "calm-red"
  | "cream-white"
  | "deep-blue";

const themes = [
  { id: "sakura", name: "樱花粉", emoji: "🌸", background: "#f5d8c8", accent: "#a86f5d" },
  { id: "lavender", name: "薰衣草紫", emoji: "💜", background: "#ede5f8", accent: "#8e72ae" },
  { id: "forest", name: "森林绿", emoji: "🌿", background: "#dfebdc", accent: "#668c61" },
  { id: "baby-blue", name: "Baby Blue", emoji: "🩵", background: "#ddeef9", accent: "#6fa6ce" },
  { id: "cream-yellow", name: "奶黄色", emoji: "🌼", background: "#f8efcb", accent: "#c9aa55" },
  { id: "calm-red", name: "Calm Red", emoji: "🌹", background: "#f5dedc", accent: "#a96868" },
  { id: "cream-white", name: "奶白色", emoji: "🤍", background: "#f0eee7", accent: "#918c80" },
  { id: "deep-blue", name: "深蓝 · 靛蓝", emoji: "🌌", background: "#dde4f4", accent: "#5969a6" },
] as const;

function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function createEmptyProfile(): UserProfile {
  return {
    id: "",
    name: "",
    nickname: "",
    avatar: null,
  };
}

export default function UserSettingsPage() {
  const [profile, setProfile] = useState<UserProfile>(createEmptyProfile);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("sakura");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedProfile = getUserProfile();
      if (savedProfile) {
        setProfile({ ...createEmptyProfile(), ...savedProfile });
      }
      const savedTheme = window.localStorage.getItem("oc-study-theme");
      const theme = isThemeId(savedTheme) ? savedTheme : "sakura";
      document.documentElement.dataset.theme = theme;
      setSelectedTheme(theme);
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = selectedTheme;
  }, [selectedTheme]);

  function updateField<Key extends keyof UserProfile>(
    field: Key,
    value: UserProfile[Key],
  ) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
    setSaveMessage("");
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        updateField("avatar", reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const profileToSave: UserProfile = {
      ...profile,
      id: profile.id || crypto.randomUUID(),
    };

    saveUserProfile(profileToSave);
    setProfile(profileToSave);
    setSaveMessage("已保存");
  }

  function handleThemeChange(theme: ThemeId) {
    window.localStorage.setItem("oc-study-theme", theme);
    setSelectedTheme(theme);
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
        <div className="mx-auto max-w-3xl text-sm text-[var(--app-secondary-text)]">正在加载我的资料...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--app-accent)]">
            Your profile
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">我的资料</h1>
          <p className="mt-3 leading-7 text-[var(--app-secondary-text)]">
            留下你的名字和头像，让 OC 更自然地称呼你。
          </p>
        </header>

        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">个人信息</h2>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--app-accent-soft)]">
              {profile.avatar ? (
                <img
                  className="h-full w-full object-cover"
                  src={profile.avatar}
                  alt="用户头像预览"
                />
              ) : (
                <span className="text-sm text-[var(--app-muted-text)]">暂无头像</span>
              )}
            </div>
            <div>
              <label className="inline-flex cursor-pointer rounded-full bg-[var(--app-primary)] px-5 py-3 text-sm font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]">
                上传头像
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                />
              </label>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--app-muted-text)]">
                支持 PNG、JPG、JPEG 和 WebP，图片会暂时保存在浏览器本地。
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              姓名
              <input
                className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                value={profile.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="输入你的姓名"
              />
            </label>
            <label className="text-sm font-medium">
              昵称
              <input
                className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                value={profile.nickname}
                onChange={(event) => updateField("nickname", event.target.value)}
                placeholder="输入你的昵称"
              />
            </label>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">🎨 颜色主题</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--app-secondary-text)]">选择一个你喜欢的学习氛围</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {themes.map((theme) => {
              const isSelected = selectedTheme === theme.id;

              return (
                <button
                  key={theme.id}
                  className={`rounded-2xl border p-4 text-left transition ${isSelected ? "border-[var(--app-primary)] ring-2 ring-[var(--app-soft-background)]" : "border-[var(--app-border)] hover:border-[var(--app-accent)]"}`}
                  type="button"
                  onClick={() => handleThemeChange(theme.id)}
                  aria-pressed={isSelected}
                  style={{ backgroundColor: theme.background }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-2xl" aria-hidden="true">{theme.emoji}</span>
                    {isSelected && <span className="text-xs font-semibold text-[var(--app-primary)]">✓ 当前使用</span>}
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-[var(--app-main-text)]">{theme.name}</span>
                  <span className="mt-3 block h-2 w-10 rounded-full" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-6 flex items-center justify-end gap-4 pb-8">
          <p className="text-sm font-medium text-[var(--app-success-text)]" aria-live="polite">
            {saveMessage}
          </p>
          <button
            className="rounded-full bg-[var(--app-primary)] px-6 py-3 text-sm font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]"
            type="button"
            onClick={handleSave}
          >
            保存我的资料
          </button>
        </div>
      </div>
    </main>
  );
}
