import type { CharacterProfile } from "@/types/character";
import type { UserProfile } from "@/types/user";
import type { StudyPlan, StudySession } from "@/types/study";

export const STORAGE_KEYS = {
  character: "oc-study-character",
  user: "oc-study-user",
  plans: "oc-study-plans",
  sessions: "oc-study-sessions",
} as const;

function readValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

function writeValue<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // MVP: storage errors are ignored so they do not break the UI.
    return false;
  }
}

export function getCharacterProfile(): CharacterProfile | null {
  return readValue<CharacterProfile | null>(STORAGE_KEYS.character, null);
}

export function saveCharacterProfile(profile: CharacterProfile): boolean {
  // MVP stores image data URLs locally; production should use object storage/CDN URLs.
  return writeValue(STORAGE_KEYS.character, profile);
}

export function getUserProfile(): UserProfile | null {
  return readValue<UserProfile | null>(STORAGE_KEYS.user, null);
}

export function saveUserProfile(profile: UserProfile): void {
  writeValue(STORAGE_KEYS.user, profile);
}

export function getStudyPlans(): StudyPlan[] {
  return readValue<StudyPlan[]>(STORAGE_KEYS.plans, []);
}

export function saveStudyPlans(plans: StudyPlan[]): void {
  writeValue(STORAGE_KEYS.plans, plans);
}

export function getStudySessions(): StudySession[] {
  return readValue<StudySession[]>(STORAGE_KEYS.sessions, []);
}

export function saveStudySessions(sessions: StudySession[]): void {
  writeValue(STORAGE_KEYS.sessions, sessions);
}
