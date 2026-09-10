"use client";

import { ChangeEvent, useEffect, useState } from "react";
import type {
  CharacterProfile,
  CharacterStyle,
  CharacterStyleSamples,
} from "@/types/character";
import {
  getCharacterProfile,
  saveCharacterProfile,
} from "@/lib/storage";

const styles: Array<{ key: CharacterStyle; label: string }> = [
  { key: "serious", label: "认真 / 严肃" },
  { key: "casual", label: "日常 / 随意" },
  { key: "coquettish", label: "撒娇 / 可爱" },
  { key: "praise", label: "夸奖" },
  { key: "comfort", label: "安慰" },
  { key: "encouragement", label: "鼓励" },
];

function createEmptyProfile(): CharacterProfile {
  return {
    id: "",
    name: "",
    nickname: "",
    selfReference: "",
    relationship: "",
    userAddress: "",
    avatar: null,
    characterImage: null,
    styleSamples: {
      serious: [],
      casual: [],
      coquettish: [],
      praise: [],
      comfort: [],
      encouragement: [],
    },
  };
}

function normalizeStyleSamples(value: unknown): CharacterStyleSamples {
  const source = value as Partial<Record<CharacterStyle, unknown>> | null;

  return styles.reduce((samples, { key }) => {
    const rawSamples = source?.[key];
    const values = Array.isArray(rawSamples)
      ? rawSamples
      : typeof rawSamples === "string"
        ? [rawSamples]
        : [];

    samples[key] = values
      .filter((sample): sample is string => typeof sample === "string")
      .map((sample) => sample.trim())
      .filter(Boolean);
    return samples;
  }, createEmptyProfile().styleSamples);
}

export default function OCSettingsPage() {
  const [profile, setProfile] = useState<CharacterProfile>(createEmptyProfile);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedProfile = getCharacterProfile();
      if (savedProfile) {
        setProfile({
          ...createEmptyProfile(),
          ...savedProfile,
          styleSamples: normalizeStyleSamples(savedProfile.styleSamples),
        });
      }
      document.documentElement.dataset.theme = window.localStorage.getItem("oc-study-theme") || "sakura";
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function updateField<Key extends keyof CharacterProfile>(
    field: Key,
    value: CharacterProfile[Key],
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
        updateField("characterImage", reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  function updateStyleSample(style: CharacterStyle, index: number, value: string) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      styleSamples: {
        ...currentProfile.styleSamples,
        [style]: currentProfile.styleSamples[style].map((sample, sampleIndex) =>
          sampleIndex === index ? value : sample,
        ),
      },
    }));
    setSaveMessage("");
  }

  function addStyleSample(style: CharacterStyle) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      styleSamples: {
        ...currentProfile.styleSamples,
        [style]: [...currentProfile.styleSamples[style], ""],
      },
    }));
    setSaveMessage("");
  }

  function removeStyleSample(style: CharacterStyle, index: number) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      styleSamples: {
        ...currentProfile.styleSamples,
        [style]: currentProfile.styleSamples[style].filter(
          (_, sampleIndex) => sampleIndex !== index,
        ),
      },
    }));
    setSaveMessage("");
  }

  function handleSave() {
    const profileToSave: CharacterProfile = {
      ...profile,
      id: profile.id || crypto.randomUUID(),
      styleSamples: normalizeStyleSamples(profile.styleSamples),
    };

    saveCharacterProfile(profileToSave);
    setProfile(profileToSave);
    setSaveMessage("已保存");
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
        <div className="mx-auto max-w-3xl text-sm text-[var(--app-secondary-text)]">正在加载 OC 资料...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-page-background)] px-5 py-10 text-[var(--app-main-text)] sm:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--app-accent)]">
            OC companion
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">创建你的 OC</h1>
          <p className="mt-3 leading-7 text-[var(--app-secondary-text)]">
            填写角色资料，让它用你熟悉的方式陪你学习。
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold">OC 图片</h2>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--app-accent-soft)] sm:w-56">
                {profile.characterImage ? (
                  <img
                    className="h-full w-full object-contain"
                    src={profile.characterImage}
                    alt="OC 图片预览"
                  />
                ) : (
                  <span className="text-sm text-[var(--app-muted-text)]">暂未上传图片</span>
                )}
              </div>
              <div>
                <label className="inline-flex cursor-pointer rounded-full bg-[var(--app-primary)] px-5 py-3 text-sm font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]">
                  上传 OC 图片
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--app-muted-text)]">
                  支持 PNG、JPG、JPEG 和 WebP。透明 PNG 可以直接作为角色图片使用。
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold">OC 基本信息</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                OC 名字
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                  value={profile.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="例如：星野"
                />
              </label>
              <label className="text-sm font-medium">
                OC 昵称
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                  value={profile.nickname}
                  onChange={(event) => updateField("nickname", event.target.value)}
                  placeholder="例如：小星"
                />
              </label>
              <label className="text-sm font-medium">
                OC 自称
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                  value={profile.selfReference}
                  onChange={(event) => updateField("selfReference", event.target.value)}
                  placeholder="例如：我、本人"
                />
              </label>
              <label className="text-sm font-medium">
                OC 与用户的关系
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                  value={profile.relationship}
                  onChange={(event) => updateField("relationship", event.target.value)}
                  placeholder="例如：学习搭子，也可以自定义"
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                OC 对用户的称呼
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                  value={profile.userAddress}
                  onChange={(event) => updateField("userAddress", event.target.value)}
                  placeholder="例如：萱萱、同学"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card-background)] p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold">语言风格示例</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-secondary-text)]">
              为每种风格添加一条或多条 OC 可能说的话。
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {styles.map(({ key, label }) => {
                const samples = profile.styleSamples[key].length
                  ? profile.styleSamples[key]
                  : [""];

                return (
                  <div key={key} className="text-sm font-medium">
                    <p>{label}</p>
                    <div className="mt-2 space-y-2">
                      {samples.map((sample, index) => (
                        <div key={`${key}-${index}`} className="flex items-center gap-2">
                          <input
                            className="min-w-0 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                            value={sample}
                            onChange={(event) => updateStyleSample(key, index, event.target.value)}
                            placeholder="输入一句示例"
                          />
                          <button
                            className="shrink-0 rounded-full border border-[var(--app-border)] px-3 py-2 text-xs font-medium text-[var(--app-accent)] transition hover:bg-[var(--app-accent-soft)]"
                            type="button"
                            onClick={() => removeStyleSample(key, index)}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-3 rounded-full border border-[var(--app-border)] px-4 py-2 text-xs font-semibold text-[var(--app-primary)] transition hover:bg-[var(--app-accent-soft)]"
                      type="button"
                      onClick={() => addStyleSample(key)}
                    >
                      + 添加一句
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pb-8">
            <p className="text-sm font-medium text-[var(--app-success-text)]" aria-live="polite">
              {saveMessage}
            </p>
            <button
              className="rounded-full bg-[var(--app-primary)] px-6 py-3 text-sm font-semibold text-[var(--app-card-background)] transition hover:bg-[var(--app-primary-hover)]"
              type="button"
              onClick={handleSave}
            >
              保存 OC 资料
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
