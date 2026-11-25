import React, { useState } from 'react';

export interface BarSeriesItem {
  label: string;
  value: number;
  secondaryValue?: number;
}

export function SimpleBarChart({
  data,
  valuePrefix = '$',
  height = 180,
  primaryColor = '#2563EB',
  secondaryColor = '#16A34A',
  primaryLabel = 'Primary',
  secondaryLabel = 'Secondary',
}: {
  data: BarSeriesItem[];
  valuePrefix?: string;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
        No time-series data recorded for this period yet.
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.value, d.secondaryValue ?? 0))
  );

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((item, idx) => {
          const h1 = Math.max(4, Math.round((item.value / maxVal) * (height - 32)));
          const h2 =
            item.secondaryValue !== undefined
              ? Math.max(4, Math.round((item.secondaryValue / maxVal) * (height - 32)))
              : null;

          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="relative flex-1 flex flex-col items-center justify-end h-full group"
            >
              {hoveredIdx === idx && (
                <div className="absolute -top-2 z-10 px-2.5 py-1.5 rounded-md bg-[#0B1528] text-white text-xs whitespace-nowrap shadow-md pointer-events-none font-mono-num">
                  <div className="font-medium text-slate-300">{item.label}</div>
                  <div>
                    {primaryLabel}: {valuePrefix}
                    {item.value.toFixed(2)}
                  </div>
                  {item.secondaryValue !== undefined && (
                    <div className="text-emerald-300">
                      {secondaryLabel}: {valuePrefix}
                      {item.secondaryValue.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
              <div className="w-full flex items-end justify-center gap-1">
                <div
                  className="w-full max-w-[26px] rounded-t transition-opacity duration-150 group-hover:opacity-85"
                  style={{ height: h1, backgroundColor: primaryColor }}
                />
                {h2 !== null && (
                  <div
                    className="w-full max-w-[26px] rounded-t transition-opacity duration-150 group-hover:opacity-85"
                    style={{ height: h2, backgroundColor: secondaryColor }}
                  />
                )}
              </div>
              <span className="mt-2 text-[11px] text-slate-500 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BreakdownBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  if (total <= 0) {
    return <div className="h-2.5 w-full rounded bg-slate-100" />;
  }
  return (
    <div className="space-y-2.5">
      <div className="h-2.5 w-full rounded overflow-hidden flex bg-slate-100">
        {segments.map((s) => {
          const pct = (Math.max(0, s.value) / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={s.label}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              title={`${s.label}: $${s.value.toFixed(2)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
        {segments.map((s) => (
          <div key={s.label} className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span>{s.label}</span>
            <span className="font-mono-num text-slate-900 font-medium">
              ${s.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
