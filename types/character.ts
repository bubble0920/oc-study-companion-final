export type CharacterStyle =
  | "serious"
  | "casual"
  | "coquettish"
  | "praise"
  | "comfort"
  | "encouragement";

export type CharacterStyleSamples = Record<CharacterStyle, string[]>;

export interface CharacterProfile {
  id: string;
  name: string;
  nickname: string;
  selfReference: string;
  relationship: string;
  userAddress: string;
  avatar: string | null;
  characterImage: string | null;
  styleSamples: CharacterStyleSamples;
}
