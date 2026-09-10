import { useState, useEffect, useRef } from "react";

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
  primary: "bg-[#3b82f6] hover:bg-[#2563eb] text-white border-none shadow-[0_8px_18px_-6px_rgba(59,130,246,0.6)]",
  secondary: "bg-[#1a1b24] hover:bg-[#22232e] text-[#e5e7eb] border border-[#232430]",
  ghost: "bg-transparent hover:bg-white/[0.04] text-[#9a9ca8] hover:text-[#f5f6fa] border-transparent",
  danger: "bg-[rgba(244,63,94,0.15)] hover:bg-[rgba(244,63,94,0.22)] text-[#fb7185] border border-[rgba(244,63,94,0.3)]",
  glow: "bg-[#3b82f6] hover:bg-[#2563eb] text-white border-none shadow-[0_12px_28px_-8px_rgba(59,130,246,0.55)]",
};

const sizeCls: Record<ButtonSize, string> = {
  xs: "h-7 px-3.5 text-[11.5px] gap-1 rounded-lg",
  sm: "h-8 px-4 text-xs font-semibold gap-1.5 rounded-lg",
  md: "h-10 px-5 text-sm font-semibold gap-2 rounded-full",
  lg: "h-12 px-7 text-[15px] font-semibold gap-2.5 rounded-full",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({
  variant = "secondary", size = "md", loading, icon, iconRight,
  children, className = "", disabled, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${variantCls[variant]} ${sizeCls[size]} ${className}`}
    >
      {loading ? <MiniSpinner /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

function MiniSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GlassCard({
  children, className = "", hover = false, gradient, onClick, animDelay,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: "indigo" | "violet" | "cyan" | "emerald" | "rose";
  onClick?: () => void;
  animDelay?: number;
}) {
  const gradients: Record<string, string> = {
    indigo: "border-[rgba(129,140,248,0.2)]",
    violet: "border-[rgba(129,140,248,0.2)]",
    cyan: "border-[rgba(59,130,246,0.2)]",
    emerald: "border-[rgba(52,211,153,0.2)]",
    rose: "border-[rgba(244,63,94,0.2)]",
  };
  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-[22px] ${hover ? "card-hover" : ""} ${gradient ? gradients[gradient] : ""} ${className}`}
      style={animDelay !== undefined ? { opacity: 0, animation: `fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) ${animDelay}s forwards` } : undefined}
    >
      {children}
    </div>
  );
}

export function ScoreRing({
  score, size = 120, strokeWidth = 8, label,
}: {
  score: number; size?: number; strokeWidth?: number; label?: string;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#34d399" : score >= 55 ? "#fbbf24" : "#fb7185";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={score >= 70 ? "#3b82f6" : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.26} fontWeight="700"
          fontFamily="'Space Grotesk', sans-serif"
          fill="#f5f6fa"
        >
          {score}
        </text>
      </svg>
      {label && <span className="text-[11px] text-[#9a9ca8] uppercase tracking-wider font-semibold">{label}</span>}
    </div>
  );
}

export function BigMetric({
  value, unit, label, trend, color = "gradient",
}: {
  value: string | number;
  unit?: string;
  label?: string;
  trend?: string;
  color?: "gradient" | "emerald" | "cyan" | "rose" | "amber" | "white";
}) {
  const colorCls: Record<string, string> = {
    gradient: "text-[#1d4ed8]",
    emerald: "text-[#059669]",
    cyan: "text-[#60a5fa]",
    rose: "text-[#fb7185]",
    amber: "text-[#92400e]",
    white: "text-[#f5f6fa]",
  };
  const up = trend?.startsWith("+");
  return (
    <div className="flex flex-col gap-1">
      <div className={`font-heading font-bold text-[32px] tracking-tight leading-none ${colorCls[color]}`}>
        {value}<span className="text-[15px] font-sans opacity-60 ml-0.5">{unit}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {label && <span className="text-xs text-[#9a9ca8] font-medium">{label}</span>}
        {trend && (
          <span className={`text-[11px] font-semibold ${up ? "text-[#059669]" : "text-[#fb7185]"}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

type BadgeVariant = "indigo" | "violet" | "cyan" | "emerald" | "amber" | "rose" | "slate" | "gradient";

const badgeCls: Record<BadgeVariant, string> = {
  indigo: "bg-[rgba(59,130,246,0.16)] text-[#93c5fd] border-[rgba(59,130,246,0.25)]",
  violet: "bg-[rgba(129,140,248,0.16)] text-[#a5b4fc] border-[rgba(129,140,248,0.25)]",
  cyan: "bg-[rgba(34,211,238,0.15)] text-[#67e8f9] border-[rgba(34,211,238,0.25)]",
  emerald: "bg-[#d1fae5] text-[#047857] border-transparent",
  amber: "bg-[#fef3c7] text-[#92400e] border-transparent",
  rose: "bg-[#fee2e2] text-[#b91c1c] border-transparent",
  slate: "bg-[#1a1b24] text-[#9a9ca8] border-[#232430]",
  gradient: "bg-[#3b82f6] text-white border-transparent",
};

export function Badge({
  variant = "slate", children, className = "", dot,
}: {
  variant?: BadgeVariant; children: React.ReactNode; className?: string; dot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeCls[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </span>
  );
}

export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(244,63,94,0.15)] text-[#fb7185] border border-[rgba(244,63,94,0.25)]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#fb7185] opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#fb7185]" />
      </span>
      {label}
    </span>
  );
}

export function Tabs({
  tabs, active, onChange,
}: {
  tabs: { id: string; label: string; badge?: string | number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[#1a1b24] rounded-full w-fit border border-[#232430]">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
            active === t.id
              ? "bg-[rgba(59,130,246,0.16)] text-[#93c5fd]"
              : "text-[#9a9ca8] hover:text-[#f5f6fa] hover:bg-white/[0.03]"
          }`}
        >
          {t.label}
          {t.badge !== undefined && (
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${active === t.id ? "bg-[rgba(59,130,246,0.25)] text-[#93c5fd]" : "bg-white/5 text-[#6b7280]"}`}>
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({
  value, max = 100, gradient = true, color, height = 5, animated = true, className = "",
}: {
  value: number; max?: number; gradient?: boolean; color?: string; height?: number; animated?: boolean; className?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`w-full rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)] ${className}`} style={{ height }}>
      <div
        className={`h-full rounded-full ${animated ? "transition-all duration-700 ease-out" : ""}`}
        style={{
          width: `${pct}%`,
          background: gradient ? "linear-gradient(90deg, #3b82f6, #818cf8, #34d399)" : color || "#3b82f6",
        }}
      />
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; icon?: React.ReactNode;
}
export function Input({ label, error, icon, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] uppercase tracking-wider text-[#9a9ca8] font-semibold">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280]">{icon}</span>}
        <input
          {...props}
          className={`w-full h-11 glass-panel rounded-xl px-4 text-sm text-[#f5f6fa] placeholder:text-[#6b7280] focus:outline-none focus:border-[rgba(59,130,246,0.4)] transition-all ${icon ? "pl-10" : ""} ${error ? "border-[rgba(244,63,94,0.4)]" : ""} ${className}`}
        />
      </div>
      {error && <span className="text-xs text-[#fb7185] font-medium">{error}</span>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] uppercase tracking-wider text-[#9a9ca8] font-semibold">{label}</label>}
      <textarea {...props} className={`w-full glass-panel rounded-xl px-4 py-3 text-sm text-[#f5f6fa] placeholder:text-[#6b7280] focus:outline-none focus:border-[rgba(59,130,246,0.4)] transition-all resize-none ${className}`} />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; options: { value: string; label: string }[];
}
export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] uppercase tracking-wider text-[#9a9ca8] font-semibold">{label}</label>}
      <select {...props} className={`w-full h-11 glass-panel rounded-xl px-4 text-sm text-[#f5f6fa] focus:outline-none focus:border-[rgba(59,130,246,0.4)] transition-all appearance-none cursor-pointer ${className}`}>
        {options.map((o) => <option key={o.value} value={o.value} className="bg-[#151622] text-[#f5f6fa]">{o.label}</option>)}
      </select>
    </div>
  );
}

export function Modal({
  open, onClose, title, children, width = "max-w-xl",
}: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; width?: string;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className={`relative glass-panel-glow rounded-[26px] w-full ${width} max-h-[90vh] overflow-y-auto anim-scale-in`}>
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#232430]">
            <h2 className="text-lg font-heading font-bold text-[#f5f6fa] tracking-tight">{title}</h2>
            <button onClick={onClose} className="text-[#9a9ca8] hover:text-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 text-lg">×</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export interface ToastItem { id: string; type: "success" | "error" | "warning" | "info"; message: string; }

const toastVariants = {
  success: "border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.08)] text-[#34d399]",
  error: "border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.08)] text-[#fb7185]",
  warning: "border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.08)] text-[#fbbf24]",
  info: "border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.08)] text-[#93c5fd]",
};

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`glass-panel flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold pointer-events-auto anim-slide-r ${toastVariants[t.type]}`}>
          {t.message}
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-50 hover:opacity-100 cursor-pointer">×</button>
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
  const color = pct >= 70 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#fb7185";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#9a9ca8] w-36 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color }}>{score}/{max}</span>
    </div>
  );
}

export function FileDropZone({
  onFile, accept = ".pdf,.doc,.docx", loading, uploaded, fileName,
}: {
  onFile: (file: File) => void; accept?: string; loading?: boolean; uploaded?: boolean; fileName?: string;
}) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => !loading && ref.current?.click()}
      className={`relative rounded-[22px] border-2 border-dashed p-10 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 ${
        drag ? "border-[#3b82f6] bg-[rgba(59,130,246,0.08)]" :
        uploaded ? "border-[rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.05)]" :
        "border-[#232430] hover:border-[rgba(255,255,255,0.15)] hover:bg-white/[0.02]"
      }`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {loading ? (
        <>
          <div className="w-14 h-14 rounded-2xl bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center text-[#93c5fd]">
            <MiniSpinner />
          </div>
          <div>
            <p className="text-base font-semibold text-[#f5f6fa] text-center">Parsing your document…</p>
            <p className="text-xs text-[#9a9ca8] text-center mt-1 uppercase tracking-wider">Extracting structured entities & claims</p>
          </div>
        </>
      ) : uploaded ? (
        <>
          <div className="w-14 h-14 rounded-2xl bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.25)] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div>
            <p className="text-base font-semibold text-[#34d399] text-center">{fileName}</p>
            <p className="text-xs text-[#9a9ca8] text-center mt-1">Parsed successfully · click to replace</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-[#1a1b24] border border-[#232430] flex items-center justify-center text-[#9a9ca8]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-[#f5f6fa] text-center">Drop your file here, or click to browse</p>
            <p className="text-xs text-[#9a9ca8] text-center mt-1 uppercase tracking-wider">PDF or DOCX · Max 10 MB</p>
          </div>
        </>
      )}
    </div>
  );
}

export function EmptyState({
  icon, title, description, action,
}: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      {icon && <div className="text-[#6b7280] mb-2">{icon}</div>}
      <h3 className="text-xl font-heading font-bold text-[#f5f6fa]">{title}</h3>
      {description && <p className="text-sm text-[#9a9ca8] max-w-xs leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

export function SectionHeader({
  title, subtitle, action, tag,
}: {
  title: string; subtitle?: string; action?: React.ReactNode; tag?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-8" style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
      <div>
        {tag && <div className="text-xs text-[#60a5fa] uppercase tracking-wider mb-2 font-bold">{tag}</div>}
        <h1 className="text-3xl font-heading font-bold text-[#f5f6fa]">{title}</h1>
        {subtitle && <p className="text-sm text-[#9a9ca8] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
