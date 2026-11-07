import React, { useState, useEffect, useRef } from "react";

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
    "bg-[#e6dfcc] hover:bg-[#f3eddb] text-[#0d0d0c] border border-[#e6dfcc] font-medium hover:shadow-[0_0_0_4px_rgba(230,223,204,0.07),0_8px_24px_-8px_rgba(230,223,204,0.26)] focus-visible:ring-2 focus-visible:ring-[#e6dfcc]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0c]",
  secondary:
    "bg-transparent hover:bg-[#20201e] text-[#ebe9e2] border border-[#3a3a36] hover:border-[#55544e] font-medium focus-visible:ring-2 focus-visible:ring-[#e6dfcc]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0c]",
  ghost:
    "bg-transparent hover:bg-[#20201e] text-[#aaa89f] hover:text-[#ebe9e2] border border-transparent font-medium",
  danger:
    "bg-transparent hover:bg-[#ff6a3d]/10 text-[#aaa89f] hover:text-[#ff6a3d] border border-[#3a3a36] hover:border-[#ff6a3d]/60 font-medium focus-visible:ring-2 focus-visible:ring-[#ff6a3d]/50",
  glow:
    "bg-[#e6dfcc] hover:bg-[#f3eddb] text-[#0d0d0c] border border-[#e6dfcc] font-medium shadow-[0_0_0_4px_rgba(230,223,204,0.07),0_8px_24px_-8px_rgba(230,223,204,0.26)] focus-visible:ring-2 focus-visible:ring-[#e6dfcc]/60",
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
      className={`inline-flex items-center justify-center font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] active:translate-y-[0.5px] outline-none ${variantCls[variant]} ${sizeCls[size]} ${className}`}
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
    indigo: "border-[#e6dfcc]/30 hover:border-[#e6dfcc]/50",
    violet: "border-[#e6dfcc]/30 hover:border-[#e6dfcc]/50",
    cyan: "border-[#e6dfcc]/30 hover:border-[#e6dfcc]/50",
    emerald: "border-[#6fd6a4]/30 hover:border-[#6fd6a4]/50",
    rose: "border-[#ff6a3d]/30 hover:border-[#ff6a3d]/50",
    amber: "border-[#e8bd6f]/30 hover:border-[#e8bd6f]/50",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-[#161614] border border-[#2b2b28] rounded-[14px] transition-colors duration-300 ${
        hover ? "card-hover hover:border-[#3a3a36]" : ""
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
  const color = score >= 75 ? "#6fd6a4" : score >= 55 ? "#e8bd6f" : "#ff6a3d";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#2b2b28"
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
          className="fill-[#ebe9e2] tabular-nums"
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="text-[10px] text-[#aaa89f] font-mono uppercase tracking-wider font-semibold">
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
    cobalt: "text-[#e6dfcc]",
    emerald: "text-[#6fd6a4]",
    cyan: "text-[#e6dfcc]",
    rose: "text-[#f08a98]",
    amber: "text-[#fbbf24]",
    white: "text-[#ebe9e2]",
  };
  const up = trend?.startsWith("+");
  return (
    <div className="flex flex-col gap-0.5">
      <div className={`font-mono font-bold text-2xl tracking-tight leading-none ${colorCls[color]}`}>
        {value}
        <span className="text-xs font-sans opacity-60 ml-1">{unit}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {label && <span className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#8f8d85]">{label}</span>}
        {trend && (
          <span className={`text-[11px] font-mono font-semibold ${up ? "text-[#6fd6a4]" : "text-[#f08a98]"}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

type BadgeVariant = "blue" | "indigo" | "violet" | "cyan" | "emerald" | "amber" | "rose" | "slate" | "gradient";

const badgeCls: Record<BadgeVariant, string> = {
  blue: "bg-[#e6dfcc]/[0.07] text-[#e6dfcc] border-[#e6dfcc]/25",
  indigo: "bg-[#e6dfcc]/[0.07] text-[#e6dfcc] border-[#e6dfcc]/25",
  violet: "bg-[#e6dfcc]/[0.07] text-[#e6dfcc] border-[#e6dfcc]/25",
  cyan: "bg-[#e6dfcc]/[0.07] text-[#e6dfcc] border-[#e6dfcc]/25",
  emerald: "bg-[#6fd6a4]/[0.07] text-[#6fd6a4] border-[#6fd6a4]/30",
  amber: "bg-[#e8bd6f]/[0.07] text-[#e8bd6f] border-[#e8bd6f]/30",
  rose: "bg-[#ff6a3d]/[0.07] text-[#ff6a3d] border-[#ff6a3d]/30",
  slate: "bg-transparent text-[#aaa89f] border-[#3a3a36]",
  gradient: "bg-[#e6dfcc]/[0.07] text-[#e6dfcc] border-[#e6dfcc]/25",
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
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#ff6a3d]/10 text-[#ff6a3d] border border-[#ff6a3d]/30">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff6a3d] opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff6a3d]" />
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
    <div className="flex items-center gap-1 p-1 bg-[#0d0d0c] rounded-[10px] w-fit border border-[#2b2b28]">
      {tabs.map((t) => {
        const isSelected = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-3 py-1.5 rounded-[7px] text-xs font-medium transition-all duration-300 cursor-pointer active:scale-[0.98] ${
              isSelected
                ? "bg-[#20201e] text-[#ebe9e2] border border-[#3a3a36]"
                : "text-[#aaa89f] hover:text-[#ebe9e2] border border-transparent"
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#2b2b28] text-[#ebe9e2]">
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
  color = "#e6dfcc",
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
    <div className={`w-full rounded-full overflow-hidden bg-[#2b2b28] ${className}`} style={{ height }}>
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
      {label && <label className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#8f8d85]">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8f8d85]">{icon}</span>
        )}
        <input
          {...props}
          className={`w-full h-10 rounded-[9px] px-3.5 text-sm text-[#ebe9e2] bg-[#0d0d0c] border border-[#3a3a36] placeholder:text-[#8f8d85] focus:outline-none focus:border-[#e6dfcc]/40 focus:ring-4 focus:ring-[#e6dfcc]/[0.07] transition-all duration-300 ${
            icon ? "pl-10" : ""
          } ${error ? "border-[#ff6a3d] focus:border-[#ff6a3d]" : ""} ${className}`}
        />
      </div>
      {error && <span className="text-xs text-[#ff6a3d] font-medium">{error}</span>}
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
      {label && <label className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#8f8d85]">{label}</label>}
      <textarea
        {...props}
        className={`w-full rounded-[9px] px-3.5 py-2.5 text-sm text-[#ebe9e2] bg-[#0d0d0c] border border-[#3a3a36] placeholder:text-[#8f8d85] focus:outline-none focus:border-[#e6dfcc]/40 focus:ring-4 focus:ring-[#e6dfcc]/[0.07] transition-all duration-300 resize-none ${
          error ? "border-rose-500" : ""
        } ${className}`}
      />
      {error && <span className="text-xs text-[#ff6a3d] font-medium">{error}</span>}
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
      {label && <label className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#8f8d85]">{label}</label>}
      <select
        {...props}
        className={`w-full h-10 rounded-[9px] px-3.5 text-sm text-[#ebe9e2] bg-[#0d0d0c] border border-[#3a3a36] focus:outline-none focus:border-[#e6dfcc]/40 focus:ring-4 focus:ring-[#e6dfcc]/[0.07] transition-all appearance-none cursor-pointer ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#161614] text-[#ebe9e2]">
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in">
      <div className="absolute inset-0 bg-[#0d0d0c]/80 backdrop-blur-md" onClick={onClose} />
      <div
        className={`relative bg-[#161614] border border-[#2b2b28] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8)] rounded-[14px] w-full ${width} max-h-[90vh] overflow-y-auto anim-apple-spring text-[#ebe9e2]`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2b2b28]">
            <h2 className="text-base sm:text-lg font-medium text-[#ebe9e2] tracking-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-[#aaa89f] hover:text-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
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
}

const toastVariants = {
  success: "border-[#6fd6a4]/30 bg-[#161614] text-[#6fd6a4]",
  error: "border-[#ff6a3d]/40 bg-[#161614] text-[#ff6a3d]",
  warning: "border-[#e8bd6f]/30 bg-[#161614] text-[#e8bd6f]",
  info: "border-[#3a3a36] bg-[#161614] text-[#e6dfcc]",
};

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border text-xs sm:text-[13px] font-medium pointer-events-auto anim-slide-r ${toastVariants[t.type]}`}
        >
          <span>{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            aria-label="Close notification"
            className="ml-2 opacity-60 hover:opacity-100 cursor-pointer p-0.5 rounded hover:bg-white/10 transition-colors"
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
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  };
  const remove = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));
  return { toasts, add, remove };
}

export function ScoreBar({ score, label, max = 10 }: { score: number; label: string; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? "#6fd6a4" : pct >= 50 ? "#e8bd6f" : "#ff6a3d";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#aaa89f] w-36 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-[3px] bg-[#2b2b28] rounded-full overflow-hidden">
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
      className={`relative rounded-[14px] border border-dashed p-8 sm:p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-150 w-full ${
        drag
          ? "border-[#e6dfcc] bg-[#e6dfcc]/[0.07]"
          : uploaded
          ? "border-[#6fd6a4]/40 bg-[#6fd6a4]/[0.05]"
          : "border-[#3a3a36] hover:border-[#55544e] bg-transparent"
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
          <div className="w-11 h-11 rounded-xl bg-[#e6dfcc]/[0.07] border border-[#e6dfcc]/25 flex items-center justify-center text-[#e6dfcc]">
            <MiniSpinner />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#ebe9e2] text-center">Parsing document...</p>
            <p className="text-xs text-[#aaa89f] font-mono text-center mt-1">Extracting skills & experience...</p>
          </div>
        </>
      ) : uploaded ? (
        <>
          <div className="w-11 h-11 rounded-xl bg-[#6fd6a4]/[0.07] border border-[#6fd6a4]/25 flex items-center justify-center text-[#6fd6a4]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#6fd6a4] text-center">{fileName}</p>
            <p className="text-xs text-[#aaa89f] text-center mt-1">Parsed successfully · click to replace</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-11 h-11 rounded-xl bg-[#20201e] border border-[#3a3a36] flex items-center justify-center text-[#e6dfcc]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#ebe9e2] text-center">Drop resume here, or click to browse</p>
            <p className="text-xs text-[#8f8d85] font-mono text-center mt-1">PDF or DOCX up to 10 MB</p>
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
      {icon && <div className="text-[#8f8d85] mb-1">{icon}</div>}
      <h3 className="text-base sm:text-lg font-medium text-[#ebe9e2]">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-[#aaa89f] max-w-sm leading-relaxed">{description}</p>}
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
          <div className="text-[10.5px] font-mono text-[#8f8d85] uppercase tracking-[0.1em] mb-2 font-medium">
            {tag}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-medium text-[#ebe9e2] tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="text-sm text-[#aaa89f] mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
