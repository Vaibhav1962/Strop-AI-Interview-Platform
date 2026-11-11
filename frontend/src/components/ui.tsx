import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Keeps something on screen for a moment after it closes so it can animate out.
 * `shown` is the last truthy value while open or leaving; `closing` is true during the exit.
 */
export function usePresence<T>(value: T | null | undefined | false, ms = 200): { shown: T | null; closing: boolean } {
  const last = useRef<T | null>(value || null);
  if (value) last.current = value;
  const open = Boolean(value);
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { shown: open || mounted ? last.current : null, closing: !open && mounted };
}

/**
 * Dialog accessibility: moves focus into the dialog, keeps Tab inside it, closes on Escape,
 * and returns focus to whatever opened it. Attach the returned ref to the dialog panel.
 */
export function useDialogA11y<T extends HTMLElement>(active: boolean, onClose?: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    const SEL = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(SEL) ?? []).filter((n) => n.offsetParent !== null);
    const el = ref.current;
    if (el && !el.hasAttribute("tabindex")) el.tabIndex = -1;
    const first = el?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? el;
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeRef.current) {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === a || document.activeElement === el)) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [active]);
  return ref;
}

/** Segmented control: one pill glides to the selected option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  quiet = false,
  full = false,
  className = "",
}: {
  options: readonly { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  quiet?: boolean;
  full?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!el) return;
      setPill((p) => (p && p.x === el.offsetLeft && p.w === el.offsetWidth ? p : { x: el.offsetLeft, w: el.offsetWidth }));
    };
    measure();
    // Re-measure whenever the control or any option changes size, and once web fonts have settled.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ref.current) {
      ro?.observe(ref.current);
      ref.current.querySelectorAll("button").forEach((b) => ro?.observe(b));
    }
    let live = true;
    document.fonts?.ready.then(() => live && measure()).catch(() => {});
    window.addEventListener("resize", measure);
    return () => {
      live = false;
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [value, options.length]);

  return (
    <div ref={ref} role="tablist" aria-label={label} className={`ob-seg ${quiet ? "ob-seg-quiet" : ""} ${full ? "ob-seg-full" : ""} ${className}`}>
      {pill && <span className="ob-seg-pill" style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} aria-hidden="true" />}
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function useAnimateIn(delay = 50) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return ready;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "glow";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const variantCls: Record<ButtonVariant, string> = {
  primary:
    "bg-ob-ac hover:bg-ob-achi text-ob-onac border border-ob-ac font-medium hover:shadow-[0_0_0_4px_rgb(var(--ob-ac-rgb)/0.07),0_8px_24px_-8px_rgb(var(--ob-ac-rgb)/0.26)] focus-visible:ring-2 focus-visible:ring-ob-ac/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ob-bg)]",
  secondary:
    "bg-transparent hover:bg-ob-bg3 text-ob-tx border border-ob-ln2 hover:border-ob-ln3 font-medium focus-visible:ring-2 focus-visible:ring-ob-ac/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ob-bg)]",
  ghost:
    "bg-transparent hover:bg-ob-bg3 text-ob-tx2 hover:text-ob-tx border border-transparent font-medium",
  danger:
    "bg-transparent hover:bg-ob-hot/10 text-ob-tx2 hover:text-ob-hot border border-ob-ln2 hover:border-ob-hot/60 font-medium focus-visible:ring-2 focus-visible:ring-ob-hot/50",
  glow:
    "bg-ob-ac hover:bg-ob-achi text-ob-onac border border-ob-ac font-medium shadow-[0_0_0_4px_rgb(var(--ob-ac-rgb)/0.07),0_8px_24px_-8px_rgb(var(--ob-ac-rgb)/0.26)] focus-visible:ring-2 focus-visible:ring-ob-ac/60",
};

const sizeCls: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1.5 rounded-[7px]",
  sm: "h-8 px-3 text-xs font-medium gap-1.5 rounded-[9px]",
  md: "h-9 sm:h-10 px-[18px] text-[13px] font-medium gap-2 rounded-[9px]",
  lg: "h-11 sm:h-12 px-6 text-sm font-medium gap-2.5 rounded-[10px]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  iconRight,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] active:translate-y-[0.5px] outline-none ${variantCls[variant]} ${sizeCls[size]} ${className}`}
    >
      {loading ? <MiniSpinner /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

export function MiniSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.7s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function GlassCard({
  children,
  className = "",
  hover = false,
  gradient,
  onClick,
  animDelay,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: "indigo" | "violet" | "cyan" | "emerald" | "rose" | "amber";
  onClick?: () => void;
  animDelay?: number;
  style?: React.CSSProperties;
}) {
  const gradientBorders: Record<string, string> = {
    indigo: "border-ob-ac/30 hover:border-ob-ac/50",
    violet: "border-ob-ac/30 hover:border-ob-ac/50",
    cyan: "border-ob-ac/30 hover:border-ob-ac/50",
    emerald: "border-ob-ok/30 hover:border-ob-ok/50",
    rose: "border-ob-hot/30 hover:border-ob-hot/50",
    amber: "border-ob-wn/30 hover:border-ob-wn/50",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-ob-bg2 border border-ob-ln rounded-[14px] transition-colors duration-300 ${
        hover ? "card-hover hover:border-ob-ln2" : ""
      } ${gradient ? gradientBorders[gradient] : ""} ${className}`}
      style={{
        ...(animDelay !== undefined
          ? { opacity: 0, animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) ${animDelay}s forwards` }
          : undefined),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export const Card = GlassCard;

export function ScoreRing({
  score,
  size = 110,
  strokeWidth = 7,
  label,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const targetOffset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const offset = mounted ? targetOffset : circ;
  const color = score >= 75 ? "var(--ob-ok)" : score >= 55 ? "var(--ob-wn)" : "var(--ob-hot)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ob-ln)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-350 ease-out"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.28}
          fontWeight="600"
          fontFamily="'JetBrains Mono', monospace"
          className="fill-ob-tx tabular-nums"
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="text-[11px] text-ob-tx2 font-mono uppercase tracking-wider font-semibold">
          {label}
        </span>
      )}
    </div>
  );
}

export function BigMetric({
  value,
  unit,
  label,
  trend,
  color = "cobalt",
}: {
  value: string | number;
  unit?: string;
  label?: string;
  trend?: string;
  color?: "cobalt" | "emerald" | "cyan" | "rose" | "amber" | "white";
}) {
  const colorCls: Record<string, string> = {
    cobalt: "text-ob-ac",
    emerald: "text-ob-ok",
    cyan: "text-ob-ac",
    rose: "text-ob-er",
    amber: "text-ob-wn",
    white: "text-ob-tx",
  };
  const up = trend?.startsWith("+");
  return (
    <div className="flex flex-col gap-0.5">
      <div className={`font-mono font-bold text-2xl tracking-tight leading-none ${colorCls[color]}`}>
        {value}
        <span className="text-xs font-sans opacity-60 ml-1">{unit}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {label && <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-ob-tx3">{label}</span>}
        {trend && (
          <span className={`text-[11px] font-mono font-semibold ${up ? "text-ob-ok" : "text-ob-er"}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

type BadgeVariant = "blue" | "indigo" | "violet" | "cyan" | "emerald" | "amber" | "rose" | "slate" | "gradient";

const badgeCls: Record<BadgeVariant, string> = {
  blue: "bg-ob-ac/[0.07] text-ob-ac border-ob-ac/25",
  indigo: "bg-ob-ac/[0.07] text-ob-ac border-ob-ac/25",
  violet: "bg-ob-ac/[0.07] text-ob-ac border-ob-ac/25",
  cyan: "bg-ob-ac/[0.07] text-ob-ac border-ob-ac/25",
  emerald: "bg-ob-ok/[0.07] text-ob-ok border-ob-ok/30",
  amber: "bg-ob-wn/[0.07] text-ob-wn border-ob-wn/30",
  rose: "bg-ob-hot/[0.07] text-ob-hot border-ob-hot/30",
  slate: "bg-transparent text-ob-tx2 border-ob-ln2",
  gradient: "bg-ob-ac/[0.07] text-ob-ac border-ob-ac/25",
};

export function Badge({
  variant = "slate",
  children,
  className = "",
  dot,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11px] font-normal font-mono border whitespace-nowrap ${badgeCls[variant]} ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-ob-hot/10 text-ob-hot border border-ob-hot/30">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-ob-hot opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ob-hot" />
      </span>
      {label}
    </span>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; badge?: string | number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-ob-bg rounded-[10px] w-fit border border-ob-ln">
      {tabs.map((t) => {
        const isSelected = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-3 py-1.5 rounded-[7px] text-xs font-medium transition duration-300 cursor-pointer active:scale-[0.98] ${
              isSelected
                ? "bg-ob-bg3 text-ob-tx border border-ob-ln2"
                : "text-ob-tx2 hover:text-ob-tx border border-transparent"
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[11px] font-mono bg-ob-ln text-ob-tx">
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--ob-ac)",
  height = 3,
  animated = true,
  className = "",
}: {
  value: number;
  max?: number;
  gradient?: boolean;
  color?: string;
  height?: number;
  animated?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`w-full rounded-full overflow-hidden bg-ob-ln ${className}`} style={{ height }}>
      <div
        className={`h-full rounded-full ${animated ? "transition-[width] duration-300 ease-out" : ""}`}
        style={{
          width: `${pct}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-mono uppercase tracking-[0.1em] text-ob-tx3">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ob-tx3">{icon}</span>
        )}
        <input
          {...props}
          className={`w-full h-10 rounded-[9px] px-3.5 text-sm text-ob-tx bg-ob-bg border border-ob-ln2 placeholder:text-ob-tx3 focus:outline-none focus:border-ob-ac/40 focus:ring-4 focus:ring-ob-ac/[0.07] transition duration-300 ${
            icon ? "pl-10" : ""
          } ${error ? "border-ob-hot focus:border-ob-hot" : ""} ${className}`}
        />
      </div>
      {error && <span className="text-xs text-ob-hot font-medium">{error}</span>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-mono uppercase tracking-[0.1em] text-ob-tx3">{label}</label>}
      <textarea
        {...props}
        className={`w-full rounded-[9px] px-3.5 py-2.5 text-sm text-ob-tx bg-ob-bg border border-ob-ln2 placeholder:text-ob-tx3 focus:outline-none focus:border-ob-ac/40 focus:ring-4 focus:ring-ob-ac/[0.07] transition duration-300 resize-none ${
          error ? "border-rose-500" : ""
        } ${className}`}
      />
      {error && <span className="text-xs text-ob-hot font-medium">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-mono uppercase tracking-[0.1em] text-ob-tx3">{label}</label>}
      <select
        {...props}
        className={`w-full h-10 rounded-[9px] px-3.5 text-sm text-ob-tx bg-ob-bg border border-ob-ln2 focus:outline-none focus:border-ob-ac/40 focus:ring-4 focus:ring-ob-ac/[0.07] transition appearance-none cursor-pointer ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ob-bg2 text-ob-tx">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const { shown, closing } = usePresence(open);
  const panelRef = useDialogA11y<HTMLDivElement>(open, onClose);
  if (!shown) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? "ob-exit-fade" : "anim-fade-in"}`}>
      <div className="absolute inset-0 bg-ob-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-ob-bg2 border border-ob-ln shadow-[0_24px_64px_-16px_rgb(var(--ob-sh)/0.8)] rounded-[14px] w-full ${width} max-h-[90vh] overflow-y-auto ${closing ? "ob-exit" : "ob-enter"} text-ob-tx`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-ob-ln">
            <h2 className="text-base sm:text-lg font-medium text-ob-tx tracking-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-ob-tx2 hover:text-ob-tx transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ob-ov/5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export interface ToastItem {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  leaving?: boolean;
}

const toastVariants = {
  success: "border-ob-ok/30 bg-ob-bg2 text-ob-ok",
  error: "border-ob-hot/40 bg-ob-bg2 text-ob-hot",
  warning: "border-ob-wn/30 bg-ob-bg2 text-ob-wn",
  info: "border-ob-ln2 bg-ob-bg2 text-ob-ac",
};

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border text-xs sm:text-[13px] font-medium pointer-events-auto ${t.leaving ? "ob-exit" : "anim-slide-r"} ${toastVariants[t.type]}`}
        >
          <span>{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            aria-label="Close notification"
            className="ml-2 opacity-60 hover:opacity-100 cursor-pointer p-0.5 rounded hover:bg-ob-ov/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const add = (type: ToastItem["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  };
  // Mark it as leaving first so it can fade out, then drop it.
  const remove = (id: string) => {
    setToasts((p) => p.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 200);
  };
  return { toasts, add, remove };
}

export function ScoreBar({ score, label, max = 10 }: { score: number; label: string; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? "var(--ob-ok)" : pct >= 50 ? "var(--ob-wn)" : "var(--ob-hot)";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ob-tx2 w-36 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-[3px] bg-ob-ln rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-bold w-10 text-right tabular-nums" style={{ color }}>
        {score}/{max}
      </span>
    </div>
  );
}

export function FileDropZone({
  onFile,
  accept = ".pdf,.doc,.docx",
  loading,
  uploaded,
  fileName,
}: {
  onFile: (file: File) => void;
  accept?: string;
  loading?: boolean;
  uploaded?: boolean;
  fileName?: string;
}) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      onClick={() => !loading && ref.current?.click()}
      className={`relative rounded-[14px] border border-dashed p-8 sm:p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition duration-150 w-full ${
        drag
          ? "border-ob-ac bg-ob-ac/[0.07]"
          : uploaded
          ? "border-ob-ok/40 bg-ob-ok/[0.05]"
          : "border-ob-ln2 hover:border-ob-ln3 bg-transparent"
      }`}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {loading ? (
        <>
          <div className="w-11 h-11 rounded-xl bg-ob-ac/[0.07] border border-ob-ac/25 flex items-center justify-center text-ob-ac">
            <MiniSpinner />
          </div>
          <div>
            <p className="text-sm font-semibold text-ob-tx text-center">Parsing document...</p>
            <p className="text-xs text-ob-tx2 font-mono text-center mt-1">Extracting skills & experience...</p>
          </div>
        </>
      ) : uploaded ? (
        <>
          <div className="w-11 h-11 rounded-xl bg-ob-ok/[0.07] border border-ob-ok/25 flex items-center justify-center text-ob-ok">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-ob-ok text-center">{fileName}</p>
            <p className="text-xs text-ob-tx2 text-center mt-1">Parsed successfully · click to replace</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-11 h-11 rounded-xl bg-ob-bg3 border border-ob-ln2 flex items-center justify-center text-ob-ac">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ob-tx text-center">Drop resume here, or click to browse</p>
            <p className="text-xs text-ob-tx3 font-mono text-center mt-1">PDF or DOCX up to 10 MB</p>
          </div>
        </>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 gap-3 text-center">
      {icon && <div className="text-ob-tx3 mb-1">{icon}</div>}
      <h3 className="text-base sm:text-lg font-medium text-ob-tx">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-ob-tx2 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  tag,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  tag?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        {tag && (
          <div className="text-[11px] font-mono text-ob-tx3 uppercase tracking-[0.1em] mb-2 font-medium">
            {tag}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-medium text-ob-tx tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="text-sm text-ob-tx2 mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
