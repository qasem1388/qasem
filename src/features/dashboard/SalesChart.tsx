import { useState } from "react";
import { useI18n } from "@/shared/i18n";
import { formatInteger } from "@/shared/lib/format";

interface Point {
  month: number;
  value: number;
}

const W = 560;
const H = 240;
const PAD = { top: 16, bottom: 32, start: 56, end: 12 };

function niceMax(v: number): number {
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

/**
 * Single-series bar chart (no legend: the card title names the series).
 * Thin bars, rounded data end, recessive grid, per-bar hover tooltip.
 * Bars run right-to-left in RTL so time reads in the reading direction.
 */
export function SalesChart({ data, rtl }: { data: Point[]; rtl: boolean }) {
  const { tx } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const plotW = W - PAD.start - PAD.end;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(36, slot * 0.5);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  // Axis sits on the start side: right in RTL.
  const plotLeft = rtl ? PAD.end : PAD.start;
  const xFor = (i: number) => {
    const idx = rtl ? data.length - 1 - i : i;
    return plotLeft + slot * idx + slot / 2;
  };

  const hovered = hover !== null ? data[hover] : undefined;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={tx("dashboard.salesChart")}>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={plotLeft} x2={plotLeft + plotW} y1={y(tv)} y2={y(tv)} stroke="var(--border)" strokeWidth={1} strokeDasharray={tv === 0 ? undefined : "3 4"} />
            <text
              x={rtl ? plotLeft + plotW + 8 : PAD.start - 8}
              y={y(tv)}
              dy="0.32em"
              textAnchor={rtl ? "start" : "end"}
              className="fill-[var(--text-subtle)] text-[11px]"
              direction="ltr"
            >
              {tv === 0 ? "0" : `${formatInteger(tv / 1000)}k`}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = xFor(i);
          const top = y(d.value);
          const h = PAD.top + plotH - top;
          const r = Math.min(4, h);
          return (
            <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Hit target wider than the bar */}
              <rect x={x - slot / 2} y={PAD.top} width={slot} height={plotH} fill="transparent" />
              <path
                d={`M${x - barW / 2},${PAD.top + plotH} V${top + r} Q${x - barW / 2},${top} ${x - barW / 2 + r},${top} H${x + barW / 2 - r} Q${x + barW / 2},${top} ${x + barW / 2},${top + r} V${PAD.top + plotH} Z`}
                fill="var(--chart)"
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <text x={x} y={H - 10} textAnchor="middle" className="fill-[var(--text-muted)] text-[12px]">
                {tx(`months.${d.month}`)}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(xFor(hover) / W) * 100}%`, top: `${(y(hovered.value) / H) * 100 - 4}%`, transform: "translate(-50%, -100%)" }}
          role="tooltip"
        >
          <p className="text-muted">{tx(`months.${hovered.month}`)}</p>
          <p className="num font-semibold text-text">{formatInteger(hovered.value)} {tx("common.sar")}</p>
        </div>
      )}
    </div>
  );
}
