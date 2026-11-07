import LandingContent from "../components/landing/LandingContent";
import { useEffect, useState } from "react";
import { ApiError, type AuthUser, login, saveSession, signup } from "../lib/api";

type AuthMode = "login" | "signup";

const FIELD = "flex flex-col gap-[7px] text-[12.5px] ob-tx2";

export default function Landing({ onEnter }: { onEnter: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetAuthForm = () => {
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setFieldErrors({});
  };

  const goToAuth = (next: AuthMode) => {
    resetAuthForm();
    setSuccessMessage(null);
    setMode(next);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    resetAuthForm();
    setSuccessMessage(null);
    setAuthOpen(false);
  };

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAuthOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [authOpen]);

  const handleAuthSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (mode === "signup" && !name.trim()) nextErrors.name = "Full name is required";
    if (!email.trim()) nextErrors.email = "Email is required";
    if (!password) nextErrors.password = "Password is required";
    else if (mode === "signup") {
      if (password.length < 8) nextErrors.password = "Use at least 8 characters";
      else if (!/[A-Z]/.test(password)) nextErrors.password = "Include at least one uppercase letter";
      else if (!/[a-z]/.test(password)) nextErrors.password = "Include at least one lowercase letter";
      else if (!/\d/.test(password)) nextErrors.password = "Include at least one number";
      else if (!/[^A-Za-z0-9]/.test(password)) nextErrors.password = "Include at least one special character";
    }
    if (mode === "signup" && confirmPassword !== password) nextErrors.confirmPassword = "Passwords don't match";

    setFieldErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "signup") {
        await signup({ full_name: name.trim(), email: normalizedEmail, password, confirm_password: confirmPassword });
        setPassword("");
        setConfirmPassword("");
        setFieldErrors({});
        setFormError(null);
        setSuccessMessage("Account created. Sign in to continue.");
        setMode("login");
      } else {
        const auth = await login({ email: normalizedEmail, password });
        saveSession(auth);
        resetAuthForm();
        setSuccessMessage(null);
        onEnter(auth.user);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="st-grain min-h-screen bg-[#121211] text-[#ebe9e2] relative overflow-x-clip text-[14px] leading-[1.55] selection:bg-[#e6dfcc]/25">
      <LandingContent onSignup={() => goToAuth("signup")} onLogin={() => goToAuth("login")} />

      {authOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade-in"
          style={{ background: "rgba(18,18,17,0.78)", backdropFilter: "blur(6px)" }}
          onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}
          role="dialog"
          aria-modal="true"
        >
          <form
            className="relative ob-card !p-7 grid gap-4 w-full max-w-[440px] max-h-[92vh] overflow-y-auto hover:!translate-y-0 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8)]" aria-labelledby="auth-title"
            onSubmit={(e) => {
              e.preventDefault();
              handleAuthSubmit();
            }}
            noValidate
          >
            <button type="button" onClick={closeAuth} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 rounded-[7px] grid place-items-center ob-tx3 hover:bg-[#20201e] hover:text-[#ebe9e2] transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <div className="flex justify-between items-baseline pr-8">
              <span id="auth-title" className="text-[17px] font-medium">{mode === "signup" ? "Create account" : "Sign in"}</span>
              <button type="button" className="text-[12.5px] ob-tx3 cursor-pointer" onClick={() => goToAuth(mode === "signup" ? "login" : "signup")}>
                {mode === "signup" ? "Have one? " : "New here? "}
                <span className="ob-txa">{mode === "signup" ? "Sign in" : "Create account"}</span>
              </button>
            </div>

            {successMessage && <div className="text-[13px] text-[#6fd6a4]" role="status">{successMessage}</div>}

            {mode === "signup" && (
              <label className={FIELD}>Full name
                <input className="ob-input !h-11" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={Boolean(fieldErrors.name)} />
                {fieldErrors.name && <span className="text-[#f08a98]">{fieldErrors.name}</span>}
              </label>
            )}
            <label className={FIELD}>Work email
              <input className="ob-input !h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} />
              {fieldErrors.email && <span className="text-[#f08a98]">{fieldErrors.email}</span>}
            </label>
            <label className={FIELD}>Password
              <input className="ob-input !h-11" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} aria-invalid={Boolean(fieldErrors.password)} />
              {fieldErrors.password && <span className="text-[#f08a98]">{fieldErrors.password}</span>}
            </label>
            {mode === "signup" && (
              <label className={FIELD}>Confirm password
                <input className="ob-input !h-11" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" aria-invalid={Boolean(fieldErrors.confirmPassword)} />
                {fieldErrors.confirmPassword && <span className="text-[#f08a98]">{fieldErrors.confirmPassword}</span>}
              </label>
            )}
            {formError && <div className="text-[13px] text-[#f08a98]" role="alert">{formError}</div>}
            <button type="submit" className="ob-btn ob-pr ob-btn-lg w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
