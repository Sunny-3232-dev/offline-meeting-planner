export enum AppStep {
  HUB = 'HUB',
  PROFILE = 'PROFILE',
  IDEAS = 'IDEAS',
  BASICS = 'BASICS',
  SCHEDULE = 'SCHEDULE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  IMAGE_PROMPTS = 'IMAGE_PROMPTS',
  CHAT_SETUP = 'CHAT_SETUP',
  SHARE = 'SHARE',
}

export interface OrganizerProfile {
  selfIntro: string;
  interests: string;
  region: string;
  hostingConcern: string;
}

/** 企画案に紐づく「軽いMVV」= 会のコンセプト */
export interface IdeaConcept {
  purpose: string; // この会の目的（軽いミッション）
  persona: string; // 来てほしい人の具体像（ペルソナ）
  cherish: string[]; // 会で大切にしたいこと（2〜3個）
}

export type IdeaCategory = 'classic' | 'niche';

export interface PlanIdea extends IdeaConcept {
  id: string;
  category: IdeaCategory;
  title: string;
  summary: string;
  venueHint: string;
  recommendedCapacity: number;
  firstTimerFriendlyPoint: string;
}

export type VenueType = 'online' | 'offline';

export interface CapacitySuggestion {
  recommended: number;
  min: number;
  max: number;
  reason: string;
}

export interface EventBasics {
  title: string;
  titleCandidates: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  venueType: VenueType;
  /** オフライン時: リベシティ公式オフィスで開催する場合のオフィスkey（''=公式オフィス以外） */
  officeKey: string;
  venueDetail: string;
  capacity: number;
  capacitySuggestion: CapacitySuggestion | null;
}

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface IconPromptResult {
  keywords: string[];
  prompt: string;
  styleNote: string;
}

export interface ThumbnailAssets {
  imagePrompt: string;
}

export interface ShareTexts {
  regionalChat: string;
  tweet: string;
}

/** 作業中オフ会のスナップショット（最大4件までHubに保存） */
export interface EventSnapshot {
  idea: PlanIdea | null;
  concept: IdeaConcept | null;
  basics: EventBasics;
  schedule: ScheduleItem[];
  announcement: string;
  iconPrompt: IconPromptResult | null;
  thumbnailAssets: ThumbnailAssets | null;
  shareTexts: ShareTexts | null;
  offkaiChatUrl: string;
  maxReached: AppStep;
  /** 生成物が「どの上流入力から作られたか」の指紋。前工程の変更検知に使う */
  scheduleSourceKey: string;
  imagesSourceKey: string;
  announcementSourceKey: string;
  shareSourceKey: string;
}

export interface SavedEvent {
  id: string;
  updatedAt: number;
  snapshot: EventSnapshot;
}
