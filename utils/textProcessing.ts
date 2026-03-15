/**
 * テキストを単語に分割し、フィルタリングする共通関数
 * @param text - 分割するテキスト
 * @returns フィルタリングされた単語の配列
 */
export const extractWords = (text: string | null | undefined): string[] => {
  if (!text) return [];

  return text
    .split(/[\s,，.．、。!！?？\n\r\t]+/)
    .filter(w => w.length >= 2 && w.length < 15);
};
