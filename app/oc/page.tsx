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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("无法读取图片文件"));
      }
    });
    reader.addEventListener("error", () => reject(new Error("无法读取图片文件")));
    reader.readAsDataURL(file);
  });
}

async function prepareCharacterImage(file: File): Promise<string> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("无法解析图片")), { once: true });
    image.src = originalDataUrl;
  });

  const maxDimension = 1200;
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maxDimension / longestSide);
  const shouldCompress = scale < 1 || file.size > 400 * 1024;

  if (!shouldCompress) {
    return originalDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器暂不支持图片压缩");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (file.type === "image/png") {
    const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
    if (webpDataUrl.startsWith("data:image/webp") && webpDataUrl.length < originalDataUrl.length) {
      return webpDataUrl;
    }

    const pngDataUrl = canvas.toDataURL("image/png");
    if (pngDataUrl.length < originalDataUrl.length) {
      return pngDataUrl;
    }
  }

  let smallestDataUrl = originalDataUrl;
  for (const quality of [0.82, 0.7, 0.58, 0.46]) {
    const webpDataUrl = canvas.toDataURL("image/webp", quality);
    const compressedDataUrl = webpDataUrl.startsWith("data:image/webp")
      ? webpDataUrl
      : canvas.toDataURL("image/jpeg", quality);

    if (compressedDataUrl.length < smallestDataUrl.length) {
      smallestDataUrl = compressedDataUrl;
    }
    if (compressedDataUrl.length <= 700_000 && compressedDataUrl.length < originalDataUrl.length) {
      return compressedDataUrl;
    }
  }

  if (smallestDataUrl.length < originalDataUrl.length) {
    return smallestDataUrl;
  }

  throw new Error("图片压缩未能减小文件体积，请换一张较小的图片。");
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

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageDataUrl = await prepareCharacterImage(file);
      updateField("characterImage", imageDataUrl);
    } catch {
      setSaveMessage("图片处理失败，请尝试使用 PNG、JPG 或 WebP 格式的较小图片。");
    }
  }

  function updateStyleSample(style: CharacterStyle, index: number, value: string) {
    setProfile((currentProfile) => {
      const currentSamples = currentProfile.styleSamples[style];
      const updatedSamples = [...currentSamples];
      while (updatedSamples.length <= index) {
        updatedSamples.push("");
      }
      updatedSamples[index] = value;
      return {
        ...currentProfile,
        styleSamples: {
          ...currentProfile.styleSamples,
          [style]: updatedSamples,
        },
      };
    });
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

    const saved = saveCharacterProfile(profileToSave);
    if (!saved) {
      setSaveMessage("保存失败：浏览器未能写入本地存储，请检查存储空间或尝试使用较小的图片。");
      return;
    }

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
                  placeholder="例如：输入 OC 名字"
                />
              </label>
              <label className="text-sm font-medium">
                OC 昵称
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-page-background)] px-4 py-3 font-normal text-[var(--app-main-text)] outline-none transition focus:border-[var(--app-accent)]"
                  value={profile.nickname}
                  onChange={(event) => updateField("nickname", event.target.value)}
                  placeholder="例如：输入昵称"
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
                  placeholder="输入希望 OC 使用的称呼"
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
