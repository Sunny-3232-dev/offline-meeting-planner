import React from 'react';
import { KanpaiIcon } from './icons';

/**
 * 円卓プログレス: 8工程を「丸テーブルを囲む8つの席」で表す。
 * 終えた工程の席が灯り（amber）、現在地は白抜きのリング、未来の席は空席。
 * 全席点灯で中央に乾杯アイコン。
 */

// 12時の席から時計回りに8席（viewBox 120x120）
export const SEAT_POSITIONS: Array<[number, number]> = [
  [60, 14],
  [92.5, 27.5],
  [106, 60],
  [92.5, 92.5],
  [60, 106],
  [27.5, 92.5],
  [14, 60],
  [27.5, 27.5],
];

const LIT_FILL = '#fbbf24'; // amber-400（ピン留めの灯と同じ）
const LIT_STROKE = '#f59e0b'; // amber-500
const NOW_STROKE = '#0284c7'; // sky-600
const EMPTY_FILL = '#f1f5f9'; // slate-100
const EMPTY_STROKE = '#cbd5e1'; // slate-300

interface SeatState {
  lit: boolean;
  current: boolean;
}

function seatStates(currentIdx: number, total = 8): SeatState[] {
  return Array.from({ length: total }, (_, i) => ({
    lit: i < currentIdx,
    current: i === currentIdx,
  }));
}

interface EntakuProgressProps {
  /** 現在の工程 index（0始まり）。8以上で「全席点灯＝完了」表示 */
  currentIdx: number;
  /** 到達済みの最大工程 index（席クリックで戻れる範囲） */
  maxIdx?: number;
  size?: number;
  labels?: string[];
  onSeatClick?: (idx: number) => void;
}

export function EntakuProgress({
  currentIdx,
  maxIdx = currentIdx,
  size = 44,
  labels = [],
  onSeatClick,
}: EntakuProgressProps) {
  const complete = currentIdx >= 8;
  const seats = seatStates(currentIdx);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={complete ? '全8工程が完了' : `8工程中${currentIdx}工程が完了`}
    >
      <circle cx="60" cy="60" r="26" fill="none" stroke={EMPTY_STROKE} strokeWidth="2" />
      {complete ? (
        <g transform="translate(44, 44)">
          <KanpaiIcon size={32} className="text-amber-500" />
        </g>
      ) : (
        <text
          x="60"
          y="66"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill="#334155"
        >
          {currentIdx}/8
        </text>
      )}
      {SEAT_POSITIONS.map(([x, y], i) => {
        const s = complete ? { lit: true, current: false } : seats[i];
        const clickable = !!onSeatClick && i <= maxIdx && i !== currentIdx;
        return (
          <g
            key={i}
            onClick={clickable ? () => onSeatClick(i) : undefined}
            style={clickable ? { cursor: 'pointer' } : undefined}
          >
            {/* タップ領域を広げる透明円 */}
            {clickable && <circle cx={x} cy={y} r="13" fill="transparent" />}
            <circle
              cx={x}
              cy={y}
              r="7"
              fill={s.lit ? LIT_FILL : s.current ? '#ffffff' : EMPTY_FILL}
              stroke={s.lit ? LIT_STROKE : s.current ? NOW_STROKE : EMPTY_STROKE}
              strokeWidth={s.current ? 2.5 : 1.5}
              style={{ transition: 'fill .3s ease, stroke .3s ease' }}
            >
              {labels[i] && <title>{labels[i]}</title>}
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

/** 生成待ち用: 席の灯りが円卓をひとまわりする（CSSアニメーションはindex.cssの.entaku-loading） */
export function EntakuLoading({ size = 96 }: { size?: number }) {
  return (
    <svg
      className="entaku-loading"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="生成中"
    >
      <circle cx="60" cy="60" r="26" fill="none" stroke={EMPTY_STROKE} strokeWidth="2" />
      {SEAT_POSITIONS.map(([x, y], i) => (
        <circle
          key={i}
          className={`seat seat-${i + 1}`}
          cx={x}
          cy={y}
          r="7"
          fill={EMPTY_FILL}
          stroke={EMPTY_STROKE}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

/** ブランドマーク: 全席が灯った小さな円卓（ヘッダー用） */
export function EntakuLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="26" fill="none" stroke="#94a3b8" strokeWidth="7" />
      {SEAT_POSITIONS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill={LIT_FILL} />
      ))}
    </svg>
  );
}
