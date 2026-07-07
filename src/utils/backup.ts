import { STORAGE_PREFIX } from './storage';

// localStorage単独保存によるデータ消失（キャッシュクリア・ブラウザ変更等）への備えとして、
// 全データをJSONファイルにエクスポート／インポートできるようにする。
const BACKUP_APP_ID = 'offkai-planner-backup';
const BACKUP_VERSION = 1;

// APIキーはバックアップファイルに絶対に含めない（ファイル共有・誤送信での漏洩防止）
const EXCLUDED_KEYS = ['apiKey'];

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  /** storageキー（プレフィックスなし） → パース済みの値 */
  data: Record<string, unknown>;
}

function collectBackupData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const fullKey of Object.keys(localStorage)) {
    if (!fullKey.startsWith(STORAGE_PREFIX)) continue;
    const key = fullKey.slice(STORAGE_PREFIX.length);
    if (EXCLUDED_KEYS.includes(key)) continue;
    const raw = localStorage.getItem(fullKey);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // 壊れた値はバックアップに含めない
    }
  }
  return data;
}

export function downloadBackup(): void {
  const backup: BackupFile = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: collectBackupData(),
  };
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offkai-planner-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): BackupFile {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('バックアップファイルを読み取れませんでした（JSON形式ではありません）。');
  }
  if (parsed?.app !== BACKUP_APP_ID || typeof parsed?.data !== 'object' || parsed.data === null) {
    throw new Error('オフ会プランナーのバックアップファイルではないようです。');
  }
  if (Number(parsed.version) > BACKUP_VERSION) {
    throw new Error(
      'このバックアップは新しいバージョンのアプリで作成されています。アプリを最新版にしてから読み込んでください。'
    );
  }
  return parsed as BackupFile;
}

/** 既存データ（APIキー以外）を消してからバックアップ内容を書き込む。呼び出し側でreloadすること */
export function applyBackup(backup: BackupFile): void {
  for (const fullKey of Object.keys(localStorage)) {
    if (!fullKey.startsWith(STORAGE_PREFIX)) continue;
    const key = fullKey.slice(STORAGE_PREFIX.length);
    if (EXCLUDED_KEYS.includes(key)) continue;
    localStorage.removeItem(fullKey);
  }
  for (const [key, value] of Object.entries(backup.data)) {
    if (EXCLUDED_KEYS.includes(key)) continue;
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  }
}
