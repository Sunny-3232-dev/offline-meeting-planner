import { GoogleGenAI } from '@google/genai';
import type {
  OrganizerProfile,
  IdeaConcept,
  PlanIdea,
  IdeaCategory,
  VenueType,
  CapacitySuggestion,
  EventBasics,
  ScheduleItem,
  IconPromptResult,
  ThumbnailAssets,
  ShareTexts,
} from '../types';

const MODEL = 'gemini-3.5-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function getClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

// プロフィール由来の表記ゆれを正規化（全プロンプトに適用）
const TEXT_REPLACEMENTS: [RegExp, string][] = [
  [/リベ大/g, 'リベシティ'],
];

function normalizePrompt(text: string): string {
  return TEXT_REPLACEMENTS.reduce((t, [pattern, replacement]) => t.replace(pattern, replacement), text);
}

function classifyError(error: any): { type: 'rate-limit' | 'auth' | 'network' | 'timeout' | 'unknown'; message: string } {
  const errorStr = error?.message || String(error);
  const status = error?.status || error?.code;

  if (status === 429 || errorStr.includes('quota') || errorStr.includes('rate limit')) {
    return {
      type: 'rate-limit',
      message:
        'APIの利用上限に達しました。しばらく待ってから再実行するか、画面右上の鍵アイコンから別のGemini APIキーを設定して再実行してください。',
    };
  }
  if (status === 401 || status === 403 || errorStr.includes('API key') || errorStr.includes('unauthorized')) {
    return {
      type: 'auth',
      message:
        'APIキーが無効です。画面右上の鍵アイコンからGemini APIキーを設定し直してください。',
    };
  }
  if (error?.name === 'AbortError' || errorStr.includes('timeout')) {
    return { type: 'timeout', message: 'リクエストがタイムアウトしました。接続を確認して再度お試しください。' };
  }
  if (!navigator.onLine || errorStr.includes('network') || errorStr.includes('fetch')) {
    return { type: 'network', message: 'ネットワーク接続を確認してください。' };
  }
  return { type: 'unknown', message: errorStr || 'AIとの通信中にエラーが発生しました。' };
}

async function callGemini(apiKey: string, prompt: string, retryCount = 0): Promise<string> {
  try {
    const client = getClient(apiKey);
    const response = await client.models.generateContent({
      model: MODEL,
      contents: normalizePrompt(prompt),
    });
    const text = response.text;
    if (!text) throw new Error('AIからの応答がありませんでした');
    return text;
  } catch (error: any) {
    const classification = classifyError(error);

    // Retry only on transient network errors (NOT on rate-limit, which would burn quota)
    if (classification.type === 'network' && retryCount < MAX_RETRIES) {
      const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callGemini(apiKey, prompt, retryCount + 1);
    }

    throw new Error(classification.message);
  }
}

function repairTruncatedJSON(jsonStr: string): string {
  let s = jsonStr.trim();
  s = s.replace(/,\s*$/, '');

  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  if (inString) s += '"';
  while (braces > 0) { s += '}'; braces--; }
  while (brackets > 0) { s += ']'; brackets--; }

  return s;
}

function extractJSON(text: string): any {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    const start = jsonStr.indexOf('{');
    const startArr = jsonStr.indexOf('[');
    const idx = start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
    if (idx === -1) throw new Error('AIの応答からJSONを解析できませんでした');
    const sub = jsonStr.slice(idx);
    try {
      return JSON.parse(sub);
    } catch {
      const repaired = repairTruncatedJSON(sub);
      try {
        return JSON.parse(repaired);
      } catch {
        throw new Error('AIの応答が途中で切れたため、JSONを解析できませんでした。再度お試しください。');
      }
    }
  }
}

export { callGemini, extractJSON };

/** 画像生成プロンプトの書き出しを既存ツールと同じ「プロのデザイナー」宣言に揃える */
const DESIGNER_PREFIX = 'あなたはプロのデザイナーです。';
function ensureDesignerPrefix(prompt: string): string {
  const trimmed = prompt.trim();
  return trimmed.startsWith(DESIGNER_PREFIX) ? trimmed : `${DESIGNER_PREFIX}${trimmed}`;
}

/** コンセプト（軽いMVV）をプロンプト用テキストに整形 */
function conceptLines(concept: IdeaConcept): string {
  return [
    `- 会の目的: ${concept.purpose}`,
    `- 来てほしい人（ペルソナ）: ${concept.persona}`,
    `- 大切にしたいこと: ${concept.cherish.join(' / ')}`,
  ].join('\n');
}

// ============================================================
// 1. generatePlanIdeas — 企画案（王道系/ニッチ系 各10件・並列生成）
//    各案にペルソナ＋軽いMVV（目的・大切にしたいこと）を内包
// ============================================================
const IDEA_CATEGORIES: { id: IdeaCategory; label: string; direction: string }[] = [
  {
    id: 'classic',
    label: '王道系',
    direction:
      'リベシティで普段からよく開かれている定番のオフ会。参加者がイメージしやすく人が集まりやすい会（例: 雑談会、交流会、勉強会、もくもく作業会、ランチ会、飲み会、カフェ会、朝活、読書会、散歩会）',
  },
  {
    id: 'niche',
    label: 'ニッチ系',
    direction:
      '主催者の趣味・専門・経験を活かした、刺さる人には強く刺さる会（例: 特定テーマの勉強会・体験会、マニアックな趣味の会、特定の悩みを語る会）',
  },
];

const IDEAS_PER_CATEGORY = 10;

async function generateIdeasForCategory(
  apiKey: string,
  profile: OrganizerProfile,
  category: { id: IdeaCategory; label: string; direction: string }
): Promise<PlanIdea[]> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、「${category.label}」のオフ会企画案を${IDEAS_PER_CATEGORY}件提案してください。

## ${category.label}とは
${category.direction}

## 主催者プロフィール
- 自己紹介: ${profile.selfIntro}
- 興味・好きなこと: ${profile.interests}
- 住んでいる地域: ${profile.region || '未記入'}
- 初主催への不安: ${profile.hostingConcern || '特になし'}

## 各フィールドの意味
- title: 企画名（30文字以内。参加者が内容をイメージできる具体的な名前）
- summary: どんな会か（80文字以内）
- persona: 来てほしい人の具体像・ペルソナ（50文字以内）
- purpose: この会の目的をひとことで（40文字以内。会の「軽いミッション」にあたるもの）
- cherish: 会で大切にしたいこと2〜3個（各15文字以内。例:「全員が話せる」「否定しない」）
- venueHint: 向いている開催形態（30文字以内。例: 平日朝のカフェ、オンラインZoom、駅近の居酒屋）
- recommendedCapacity: 目安の定員（主催者含む人数。初主催なら4〜8人を中心に）
- firstTimerFriendlyPoint: 初主催でもやりやすい理由（60文字以内）

## 注意事項
- 初主催者が「これならできそう」と思える、運営が簡単な企画を優先すること
- 会場手配・機材・事前準備のハードルが高い企画は避けること
- ${IDEAS_PER_CATEGORY}件はテーマ・開催形態・時間帯にバリエーションを持たせること
- 主催者の興味・得意を反映しつつ、王道系では誰でも参加しやすい定番の形を大事にすること
- personaとpurposeは企画ごとに具体的に変えること（汎用文の使い回しをしない）

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
[
  {
    "title": "...",
    "summary": "...",
    "persona": "...",
    "purpose": "...",
    "cherish": ["...", "..."],
    "venueHint": "...",
    "recommendedCapacity": 6,
    "firstTimerFriendlyPoint": "..."
  }
]
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const list: any[] = Array.isArray(parsed) ? parsed : parsed?.ideas || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('企画案の生成結果を読み取れませんでした。再度お試しください。');
  }
  return list
    .filter((i) => i && i.title)
    .map((i) => ({
      id: crypto.randomUUID(),
      category: category.id,
      title: String(i.title || ''),
      summary: String(i.summary || ''),
      persona: String(i.persona || ''),
      purpose: String(i.purpose || ''),
      cherish: Array.isArray(i.cherish) ? i.cherish.map(String).slice(0, 3) : [],
      venueHint: String(i.venueHint || ''),
      recommendedCapacity: Number(i.recommendedCapacity) || 6,
      firstTimerFriendlyPoint: String(i.firstTimerFriendlyPoint || ''),
    }));
}

export async function generatePlanIdeas(
  apiKey: string,
  profile: OrganizerProfile
): Promise<PlanIdea[]> {
  // 王道系・ニッチ系を並列生成（片方が失敗しても全滅させない）
  const results = await Promise.allSettled(
    IDEA_CATEGORIES.map((c) => generateIdeasForCategory(apiKey, profile, c))
  );
  const ideas = results
    .filter((r): r is PromiseFulfilledResult<PlanIdea[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
  if (ideas.length === 0) {
    const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    throw firstError?.reason instanceof Error
      ? firstError.reason
      : new Error('企画案の生成に失敗しました。再度お試しください。');
  }
  return ideas;
}

// ============================================================
// 2. generateTitleCandidates — タイトル候補（5件）
// ============================================================
export async function generateTitleCandidates(
  apiKey: string,
  concept: IdeaConcept,
  idea: PlanIdea
): Promise<string[]> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
以下のオフ会企画のタイトル候補を5件提案してください。

## 企画内容
- 企画名（仮）: ${idea.title}
- 概要: ${idea.summary}
${conceptLines(concept)}

## タイトルの条件
- 30文字以内
- 何をする会か・誰向けかが一目でわかること
- 初参加でも気軽に申し込めそうな親しみやすい表現
- 絵文字は多くても1つまで
- 5件はそれぞれ違う切り口にすること（内容説明型 / 呼びかけ型 / 数字入り / ターゲット明示型 / キャッチー型 など）

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
{ "titles": ["...", "...", "...", "...", "..."] }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const titles: any[] = Array.isArray(parsed) ? parsed : parsed?.titles || [];
  if (!Array.isArray(titles) || titles.length === 0) {
    throw new Error('タイトル候補の生成結果を読み取れませんでした。再度お試しください。');
  }
  return titles.map(String).filter(Boolean).slice(0, 5);
}

// ============================================================
// 3. suggestCapacity — 定員の推奨
// ============================================================
export async function suggestCapacity(
  apiKey: string,
  idea: PlanIdea,
  venueTypeOrBasics: VenueType | EventBasics,
  venueDetail?: string,
  durationMinutes?: number
): Promise<CapacitySuggestion> {
  let finalVenueType: VenueType;
  let finalVenueDetail: string;
  let finalDurationMinutes: number;

  if (typeof venueTypeOrBasics === 'object' && venueTypeOrBasics !== null) {
    finalVenueType = venueTypeOrBasics.venueType;
    finalVenueDetail = venueTypeOrBasics.venueDetail;
    finalDurationMinutes = venueTypeOrBasics.durationMinutes;
  } else {
    finalVenueType = venueTypeOrBasics as VenueType;
    finalVenueDetail = venueDetail || '';
    finalDurationMinutes = durationMinutes || 120;
  }

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、以下の条件に合った定員（主催者を含む人数）を提案してください。

## 条件
- 企画: ${idea.title}（${idea.summary}）
- 開催形態: ${finalVenueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
- 場所: ${finalVenueDetail || '未定'}
- 開催時間: ${finalDurationMinutes}分

## 考慮すること
- 初主催者が全員に目を配れる人数であること（多すぎは禁物）
- 時間内に全員が自己紹介や会話に参加できること
- 1〜2人欠席しても会が成立する人数であること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。reasonは80文字以内。

\`\`\`json
{ "recommended": 6, "min": 4, "max": 8, "reason": "..." }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const recommended = Number(parsed?.recommended);
  if (!recommended) {
    throw new Error('定員の提案結果を読み取れませんでした。再度お試しください。');
  }
  return {
    recommended,
    min: Number(parsed?.min) || Math.max(2, recommended - 2),
    max: Number(parsed?.max) || recommended + 2,
    reason: String(parsed?.reason || ''),
  };
}

// ============================================================
// 4. generateSchedule — 進行イメージ（タイムスケジュール）生成
// ============================================================
export async function generateSchedule(
  apiKey: string,
  basics: EventBasics,
  concept: IdeaConcept,
  idea: PlanIdea
): Promise<Omit<ScheduleItem, 'id'>[]> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、当日の進行イメージ（タイムスケジュール）を作ってください。

## オフ会の情報
- タイトル: ${basics.title}
- 企画: ${idea.title}（${idea.summary}）
- 開催形態: ${basics.venueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
- 場所: ${basics.venueDetail}
- 開催時間: ${basics.durationMinutes}分
- 定員: ${basics.capacity}人（主催者含む）
${conceptLines(concept)}

## 進行イメージの条件
- 各項目は {title, description, durationMinutes} で構成
- **durationMinutesの合計が必ず${basics.durationMinutes}分ちょうどになること**
- 冒頭にオープニング（挨拶・趣旨説明）、終盤にクロージング（まとめ・次回予告・解散）を入れること
- 定員${basics.capacity}人が全員話せるよう、自己紹介の時間は1人あたり1〜2分で計算すること
- descriptionには主催者向けの進行のコツを書くこと（50文字以内。例: 「主催者から先に話すと場が和みます」）
- 項目数は5〜8個程度
- 初主催者が迷わない、シンプルで無理のない進行にすること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
[
  { "title": "オープニング", "description": "...", "durationMinutes": 10 }
]
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const list: any[] = Array.isArray(parsed) ? parsed : parsed?.schedule || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('進行イメージの生成結果を読み取れませんでした。再度お試しください。');
  }
  return list
    .filter((i) => i && i.title)
    .map((i) => ({
      title: String(i.title),
      description: String(i.description || ''),
      durationMinutes: Math.max(1, Number(i.durationMinutes) || 10),
    }));
}

// ============================================================
// 5. generateAnnouncement — 告知文生成
// ============================================================
export async function generateAnnouncement(
  apiKey: string,
  profile: OrganizerProfile,
  concept: IdeaConcept,
  basics: EventBasics,
  schedule: ScheduleItem[],
  formattedDate: string,
  timeRanges: string[],
  feedback?: string
): Promise<string> {
  const scheduleText = schedule
    .map((s, i) => `${timeRanges[i] || ''} ${s.title}`)
    .join('\n');

  const feedbackSection =
    feedback && feedback.trim()
      ? `\n## 書き直しの要望（必ず反映すること・最優先で従うこと）\n${feedback.trim()}\n`
      : '';

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
初めてオフ会を主催する人のために、リベシティのオフ会チャット作成フォームの「詳細（公開情報）」欄に掲載する告知文を書いてください。

## オフ会の情報
- タイトル: ${basics.title}
- 日時: ${formattedDate} ${basics.startTime}〜（${basics.durationMinutes}分）
- 開催形態: ${basics.venueType === 'online' ? 'オンライン' : 'オフライン（対面）'}
- 場所: ${basics.venueDetail}
- 定員: ${basics.capacity}人（主催者含む）
${conceptLines(concept)}

## 当日の流れ
${scheduleText}

## 主催者について
${profile.selfIntro}
${feedbackSection}
## 告知文の構成（この順で）
1. 挨拶と自己紹介（1〜2文。初主催であることを正直に、親しみやすく）
2. どんな会か（会の目的・大切にしたいことを自然な文章で）
3. こんな人に来てほしい（ペルソナをやわらかい表現で）
4. 開催概要（日時・場所・定員を見やすい箇条書きで）
5. 当日の流れ（タイムテーブル）
6. 参加方法・ひとこと（気軽に参加してほしい旨）

## 注意事項
- 全体で600〜900文字程度
- 絵文字を適度に使い、堅くなりすぎないこと
- 「初めての方も大歓迎」の空気を作ること
- 見出しや区切り線を使って読みやすくすること
- リベシティの仕様上、Markdown記法（# 見出し、**太字**、* 箇条書き など）は使用できません。絶対にアスタリスク「**」やシャープ「#」などのマークダウン記号は含めず、プレーンテキスト（空白行、改行、全角の「■」「▼」「・」など）を使って見やすく整形して出力してください。

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。bodyに告知文全体を入れること。

\`\`\`json
{ "body": "..." }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const body = String(parsed?.body || '');
  if (!body) {
    throw new Error('告知文の生成結果を読み取れませんでした。再度お試しください。');
  }
  return body;
}

// ============================================================
// 6. generateIconPrompt — 円形オフ会アイコン用プロンプト
//    AIにはキーワードだけを考えさせ、プロンプト文の組み立てはコード側で行う
// ============================================================
const ICON_KEYWORD_COUNT = 6;

function buildIconPrompt(keywords: string[]): string {
  const list = keywords.filter(Boolean).join('、');
  return `あなたはプロのデザイナーです。以下のキーワードをもとに、円形のオフ会アイコンをデザインしてください。

キーワード: ${list}

条件:
・完全な円形のアイコン（丸くクロップされた構図、背景は白または透過）
・文字は入れない（文字化けを防ぐため）
・中央にモチーフを大きく配置
・フラットで親しみやすいイラストスタイル
・SNSアイコンとして小さく表示されても内容がわかるシンプルさ`;
}

export async function generateIconPrompt(
  apiKey: string,
  concept: IdeaConcept,
  idea: PlanIdea,
  basics: EventBasics
): Promise<IconPromptResult> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
オフ会の「円形アイコン」のデザインに使う、視覚的なキーワードを${ICON_KEYWORD_COUNT}個抽出してください（文章ではなく単語・短いフレーズのみ）。

## オフ会の情報
- タイトル: ${basics.title}
- 内容: ${idea.summary}
- 雰囲気: ${concept.cherish.join('、')}

## キーワードの条件
- 1〜2単語程度の短いキーワードにすること（説明文にしない）
- モチーフ・シンボル・色・雰囲気を表す、絵にしやすい具体的な言葉を選ぶこと（例: コーヒーカップ、朝日、ノートPC、あたたかい配色）
- 抽象的すぎる言葉（例:「絆」「成長」）は避けること

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
{ "keywords": ["...", "...", "...", "...", "...", "..."], "styleNote": "主催者向けの補足（生成のコツ、40文字以内）" }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  const keywords: string[] = Array.isArray(parsed?.keywords)
    ? parsed.keywords.map(String).filter(Boolean).slice(0, ICON_KEYWORD_COUNT)
    : [];
  if (keywords.length === 0) {
    throw new Error('アイコン用キーワードの生成結果を読み取れませんでした。再度お試しください。');
  }
  return {
    keywords,
    prompt: buildIconPrompt(keywords),
    styleNote: String(parsed?.styleNote || ''),
  };
}

// ============================================================
// 7. generateThumbnailAssets — 告知サムネイル用プロンプト＋文言
// ============================================================
export async function generateThumbnailAssets(
  apiKey: string,
  concept: IdeaConcept,
  idea: PlanIdea,
  basics: EventBasics,
  formattedDate: string
): Promise<ThumbnailAssets> {
  const venueLabel = basics.venueType === 'online' ? 'オンライン' : basics.venueDetail;
  // 日付計算はAIに任せず、コード側で確定した文字列をそのまま画像に焼き込ませる
  const dateTimeText = `${formattedDate} ${basics.startTime}〜`;
  const placeText = venueLabel;

  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
オフ会の「告知サムネイル画像」を画像生成AI（ChatGPT/Gemini等）で作るためのプロンプトを作ってください。
この画像には、キャッチーなタイトル・日時・場所の文字を実際に描き込みます（あとからの文字入れは行いません）。

## オフ会の情報
- タイトル: ${basics.title}
- 内容: ${idea.summary}
- 雰囲気: ${concept.cherish.join('、')}

## 画像に描き込む文字（この文言・表記のまま使うこと）
- 日時: 「${dateTimeText}」
- 場所: 「${placeText}」
※ キャッチーなタイトルはあなたが考え、そのままimagePrompt内で使うこと

## imagePromptの必須条件（プロンプト文に必ず含めること）
- プロンプトは必ず「あなたはプロのデザイナーです。」という一文で書き始めること
- 横長（16:9）の告知バナー構図
- 会の内容が伝わるイメージイラスト（人物が楽しそうに集まる様子など）
- あなたが考えたキャッチーなタイトル（20文字以内）を、画像内で最も大きく目立つように配置すること
- 日時「${dateTimeText}」と場所「${placeText}」を、タイトルより小さく読みやすいサイズで画像内に配置すること
- 文字は背景との十分なコントラストを確保し、はっきり読めるようにすること
- 明るく参加したくなる配色

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。imagePromptに完成したプロンプト全文を入れること。

\`\`\`json
{ "imagePrompt": "..." }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  if (!parsed?.imagePrompt) {
    throw new Error('サムネイル素材の生成結果を読み取れませんでした。再度お試しください。');
  }
  return {
    imagePrompt: ensureDesignerPrefix(String(parsed.imagePrompt)),
  };
}

// ============================================================
// 8. generateShareTexts — 展開用の文体違い2種
// ============================================================
export async function generateShareTexts(
  apiKey: string,
  announcement: string,
  basics: EventBasics,
  region: string,
  formattedDate: string
): Promise<ShareTexts> {
  const prompt = `あなたはリベシティ（オンラインコミュニティ）のオフ会企画をサポートするAIです。
以下のオフ会告知文をもとに、2つの場所に投稿する文章を作ってください。

## 元の告知文
${announcement}

## オフ会の基本情報
- タイトル: ${basics.title}
- 日時: ${formattedDate} ${basics.startTime}〜
- 主催者の地域: ${region || '未記入'}

## 作る文章
1. regionalChat: 地域支部チャット（例: 関東チャット）向け
   - 「${region || '地域'}の皆さん」への呼びかけで始める
   - 丁寧め・300〜400文字程度
   - 日時・場所・定員を含める
   - 最後に「詳細・お申し込みはイベント案内をご覧ください」で締める
2. tweet: リベシティの「つぶやき」向け
   - カジュアル・**90文字以内**（本文の後ろにオフ会チャットのURLを付けて合計140文字に収めるため、必ず短くすること）
   - 絵文字を使って気軽な雰囲気に
   - 初主催であることを添えて応援したくなる文面に

## 出力形式（JSON）
必ず有効なJSONのみを出力してください。

\`\`\`json
{ "regionalChat": "...", "tweet": "..." }
\`\`\``;

  const text = await callGemini(apiKey, prompt);
  const parsed = extractJSON(text);
  if (!parsed?.regionalChat && !parsed?.tweet) {
    throw new Error('展開用文章の生成結果を読み取れませんでした。再度お試しください。');
  }
  return {
    regionalChat: String(parsed.regionalChat || ''),
    tweet: String(parsed.tweet || ''),
  };
}
