import { useRef } from "react";
import { useTheme } from "../lib/theme";

/** Sun/moon button. The theme floods in from this button as a wavy water front. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const isDark = theme === "dark";

  const onClick = () => {
    const r = ref.current?.getBoundingClientRect();
    toggle(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`relative w-8 h-8 p-0 rounded-full bg-ob-bg3 border border-ob-ln2 inline-flex items-center justify-center text-ob-ac cursor-pointer hover:border-ob-ln3 transition-colors overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="absolute transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: isDark ? "rotate(0) scale(1)" : "rotate(90deg) scale(0.4)", opacity: isDark ? 1 : 0 }}
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="absolute transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: isDark ? "rotate(-90deg) scale(0.4)" : "rotate(0) scale(1)", opacity: isDark ? 0 : 1 }}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
