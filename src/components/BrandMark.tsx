import React from 'react';

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="28"
        height="28"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          width="36"
          height="36"
          rx="8"
          fill={light ? '#16233B' : '#0B1528'}
        />
        <path
          d="M7.5 11l3.6 14h3.2l3.7-9.8 3.7 9.8h3.2l3.6-14h-3.6l-2 9.2-3.4-9.2h-3l-3.4 9.2-2-9.2H7.5z"
          fill="#FFFFFF"
        />
        <circle cx="28" cy="25" r="2.8" fill="#2563EB" />
      </svg>
      <span
        className={`font-display text-lg font-bold tracking-tight ${
          light ? 'text-white' : 'text-[#0B1528]'
        }`}
      >
        Workaby AI
      </span>
    </span>
  );
}

export function formatUsd(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return `$${Number.isFinite(num) ? num.toFixed(2) : '0.00'}`;
}

export function formatKes(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return `KES ${Number.isFinite(num) ? Math.round(num).toLocaleString('en-KE') : '0'}`;
}

export function tierLabel(tier: string): string {
  switch (tier) {
    case 'verified':
      return 'Verified Member';
    case 'pro':
      return 'Pro Worker';
    case 'top_rated':
      return 'Top-Rated Worker';
    default:
      return 'Free Member';
  }
}
