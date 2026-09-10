import { useState } from "react";
import { Button, GlassCard, Badge, Input, Select, Tabs } from "../components/ui";
import { mockUser } from "../data/mock";

export default function Settings({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [targetRole, setTargetRole] = useState(mockUser.targetRole);
  const [targetCompany, setTargetCompany] = useState(mockUser.targetCompany);
  const [saved, setSaved] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [strictByDefault, setStrictByDefault] = useState(false);
  const [emailReports, setEmailReports] = useState(true);
  const [lang, setLang] = useState("Python");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-3xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Account</div>
        <h1 className="text-4xl font-heading font-bold text-[#f5f6fa] mb-8">Settings</h1>
      </div>

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: "profile", label: "Profile" },
            { id: "interview", label: "Interview Prefs" },
            { id: "notifications", label: "Notifications" },
            { id: "danger", label: "Danger Zone" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "profile" && (
        <div className="flex flex-col gap-4">
          <GlassCard className="p-6" animDelay={0.1}>
            <div className="flex items-center gap-5 mb-6 pb-6 border-b border-white/8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                {name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white">{name}</div>
                <div className="text-sm text-slate-500">{email}</div>
                <div className="text-xs text-slate-600 mt-0.5">{mockUser.role} · {mockUser.experience}</div>
              </div>
              <Badge variant="gradient">Pro</Badge>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-600 uppercase tracking-wider block mb-1.5">Full Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-600 uppercase tracking-wider block mb-1.5">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-600 uppercase tracking-wider block mb-1.5">Target Role</label>
                  <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-600 uppercase tracking-wider block mb-1.5">Target Company</label>
                  <Input value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} />
                </div>
              </div>
            </div>
          </GlassCard>
          <Button variant="glow" onClick={handleSave} className="w-full">
            {saved ? "Saved ✓" : "Save Changes"}
          </Button>
        </div>
      )}

      {tab === "interview" && (
        <div className="flex flex-col gap-4">
          <GlassCard className="p-6" animDelay={0.1}>
            <h3 className="text-sm font-bold text-white mb-4">Preferences</h3>
            <div className="flex flex-col gap-4">
              {[
                { label: "Voice Input", sub: "Use microphone for interview responses", v: voiceEnabled, set: setVoiceEnabled },
                { label: "Auto-save Transcripts", sub: "Save full transcripts after each session", v: autoSave, set: setAutoSave },
                { label: "Strict Mode by Default", sub: "Enable timed, pressured interview mode", v: strictByDefault, set: setStrictByDefault },
              ].map((pref) => (
                <div
                  key={pref.label}
                  className="flex items-center justify-between gap-4 py-3 border-b border-white/8 last:border-0 cursor-pointer"
                  onClick={() => pref.set((v: boolean) => !v)}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{pref.label}</div>
                    <div className="text-xs text-slate-500">{pref.sub}</div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all relative shrink-0 ${pref.v ? "bg-indigo-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${pref.v ? "left-5" : "left-1"}`} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-6" animDelay={0.15}>
            <h3 className="text-sm font-bold text-white mb-4">Coding Defaults</h3>
            <div>
              <label className="text-xs font-mono text-slate-600 uppercase tracking-wider block mb-1.5">Preferred Language</label>
              <Select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                options={["Python", "JavaScript", "TypeScript", "Java", "C++", "Go", "Rust"].map((v) => ({ value: v, label: v }))}
              />
            </div>
          </GlassCard>
          <Button variant="glow" onClick={handleSave} className="w-full">
            {saved ? "Saved ✓" : "Save Changes"}
          </Button>
        </div>
      )}

      {tab === "notifications" && (
        <GlassCard className="p-6" animDelay={0.1}>
          <h3 className="text-sm font-bold text-white mb-4">Email Notifications</h3>
          <div className="flex flex-col gap-3">
            {[
              { l: "Interview Reports", sub: "Get a report emailed after each session", v: emailReports, set: setEmailReports },
              { l: "Weekly Progress Summary", sub: "Weekly digest of your improvement", v: true },
              { l: "Practice Reminders", sub: "Daily reminders to practice", v: false },
              { l: "Product Updates", sub: "New features and improvements", v: true },
            ].map((n) => (
              <div
                key={n.l}
                className="flex items-center justify-between gap-4 py-3 border-b border-white/8 last:border-0 cursor-pointer"
                onClick={() => n.set?.((v: boolean) => !v)}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-200">{n.l}</div>
                  <div className="text-xs text-slate-500">{n.sub}</div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-all relative shrink-0 ${n.v ? "bg-indigo-500" : "bg-white/10"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${n.v ? "left-5" : "left-1"}`} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {tab === "danger" && (
        <div className="flex flex-col gap-4">
          <GlassCard className="p-6" animDelay={0.1}>
            <h3 className="text-sm font-bold text-rose-400 mb-4">Danger Zone</h3>
            <div className="flex flex-col gap-4">
              {[
                { l: "Clear all interview history", sub: "Permanently delete all sessions and reports", btn: "Clear History" },
                { l: "Reset training plan", sub: "Reset progress on all training items", btn: "Reset Training" },
                { l: "Delete account", sub: "Permanently delete your account and all data", btn: "Delete Account" },
              ].map((action) => (
                <div key={action.l} className="flex items-center justify-between gap-4 py-3 border-b border-white/8 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{action.l}</div>
                    <div className="text-xs text-slate-500">{action.sub}</div>
                  </div>
                  <Button variant="danger" size="xs">{action.btn}</Button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
