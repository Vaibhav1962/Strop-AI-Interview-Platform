import { useId } from "react";

/**
 * Strop mark: a bold S on a rounded tile, sliced by one orange stroke.
 * A strop is the strap a blade is honed on, so the orange line is the keen edge drawn across the S.
 * The tile and S follow the theme (cream tile in dark, ink tile in light); the blade stays orange.
 */
export default function Logo({ size = 24, className }: { size?: number; className?: string }) {
  const k = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" className={`shrink-0 ${className ?? ""}`} aria-hidden="true">
      <defs>
        <linearGradient id={`t${k}`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--ob-logo-a)" />
          <stop offset="1" stopColor="var(--ob-logo-b)" />
        </linearGradient>
        <linearGradient id={`b${k}`} x1="6" y1="46" x2="58" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff7a3d" />
          <stop offset="1" stopColor="#ff4d1a" />
        </linearGradient>
        <linearGradient id={`h${k}`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${k}`}>
          <rect x="1" y="1" width="62" height="62" rx="16" />
        </clipPath>
        <mask id={`m${k}`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d="M4 45.5L60 18.5" stroke="#000" strokeWidth="7.5" />
        </mask>
      </defs>
      <g clipPath={`url(#c${k})`}>
        <rect width="64" height="64" fill={`url(#t${k})`} />
        <rect width="64" height="64" fill={`url(#h${k})`} />
        <g mask={`url(#m${k})`}>
          <path d="M45 13.5H26A9.25 9.25 0 0 0 26 32H38A9.25 9.25 0 0 1 38 50.5H19" stroke="var(--ob-logo-s)" strokeWidth="8" strokeLinejoin="round" />
        </g>
        <path d="M4 45.5L60 18.5" stroke={`url(#b${k})`} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
