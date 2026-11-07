/**
 * Strop mark: an angular S built from straight segments with a blade-orange edge at its tail.
 * Strop is the strap a blade is honed on, so the S is the strap and the orange stroke is the edge.
 */
export default function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <path
        d="M50 14H25Q18 14 18 21V22Q18 29 25 29H39Q46 29 46 36V37Q46 44 39 44H14"
        stroke="#e6dfcc"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path d="M10 50L18 44" stroke="#ff6a3d" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
