// リベシティのオフ会作成はチャット一覧画面のモーダルから行う（専用URLなし・2026-07確認）。
// 「＋チャット作成」→「オフ会チャットを新規作成」で作成フォームが開く。
export const LIBECITY_EVENT_CREATE_URL = 'https://libecity.com/room_list';

export const APP_NAME = 'オフ会プランナー';
export const APP_TAGLINE = 'はじめてのオフ会主催を、企画から告知まで背中を押す';

export const DURATION_OPTIONS = [60, 90, 120, 150, 180] as const;

// 企画案のピン留め上限（多すぎると選びにくくなるため）
export const MAX_PINNED_IDEAS = 4;

// 保存できるオフ会の最大数
export const MAX_SAVED_EVENTS = 4;

// リベシティ公式オフィス（14拠点・オフ会作成モーダルのselect実値。2026-07実地調査）
export interface OfficialOffice {
  key: string;
  label: string;
}

export const OFFICIAL_OFFICES: OfficialOffice[] = [
  { key: 'sapporo', label: '北海道(札幌)オフィス' },
  { key: 'miyagi', label: '宮城オフィス' },
  { key: 'shinbashi', label: '東京(新橋)オフィス' },
  { key: 'ikebukuro', label: '東京(池袋)オフィス' },
  { key: 'shinjuku', label: '東京(新宿西口)オフィス' },
  { key: 'tachikawa', label: '東京(立川)オフィス' },
  { key: 'yokohama', label: '神奈川(横浜)オフィス' },
  { key: 'nagoya', label: '愛知(名古屋)オフィス' },
  { key: 'yotsubashi', label: '大阪(四ツ橋)オフィス' },
  { key: 'umeda', label: '大阪(梅田)オフィス' },
  { key: 'kyoto', label: '京都オフィス' },
  { key: 'kobe', label: '兵庫(神戸)オフィス' },
  { key: 'hiroshima', label: '広島オフィス' },
  { key: 'fukuoka', label: '福岡オフィス' },
];

export function officeLabel(key: string): string {
  const office = OFFICIAL_OFFICES.find((o) => o.key === key);
  return office ? office.label : '';
}

// 支部チャットの定義（8つ・room_idは実地調査値）
export interface BranchChat {
  id: string;
  name: string;
  roomId: string;
  keywords: string[];
}

export const BRANCH_CHATS: BranchChat[] = [
  { id: 'Hokkaido', name: '北海道支部', roomId: 'Hokkaido', keywords: ['北海道', '札幌', '旭川', '函館'] },
  { id: 'Tohoku', name: '東北支部', roomId: 'Tohoku', keywords: ['青森', '岩手', '宮城', '仙台', '秋田', '山形', '福島'] },
  { id: 'Kanto', name: '関東支部', roomId: 'Kanto', keywords: ['東京', '神奈川', '横浜', '川崎', '埼玉', '千葉', '茨城', '栃木', '群馬', '関東'] },
  { id: 'Hokuriku-Shinetsu', name: '北陸・信越支部', roomId: 'Hokuriku-Shinetsu', keywords: ['富山', '石川', '金沢', '福井', '新潟', '長野'] },
  { id: 'Tokai', name: '東海支部', roomId: 'Tokai', keywords: ['愛知', '名古屋', '岐阜', '静岡', '三重', '東海'] },
  { id: 'Kinki', name: '近畿支部', roomId: 'Kinki', keywords: ['大阪', '兵庫', '神戸', '京都', '滋賀', '奈良', '和歌山', '近畿', '関西'] },
  { id: 'Chugoku-Shikoku', name: '中国・四国支部', roomId: 'Chugoku-Shikoku', keywords: ['鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '高松', '愛媛', '高知'] },
  { id: 'Kyushu-Okinawa', name: '九州・沖縄支部', roomId: 'Kyushu-Okinawa', keywords: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄', '那覇'] },
];

export function branchChatUrl(id: string): string {
  return `https://libecity.com/room_list?room_id=${id}`;
}

export function guessBranch(region?: string): BranchChat | null {
  if (!region) return null;
  const normalized = region.toLowerCase();
  for (const branch of BRANCH_CHATS) {
    if (branch.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
      return branch;
    }
  }
  return null;
}
