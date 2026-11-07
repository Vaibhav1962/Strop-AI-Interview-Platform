import React from "react";

interface WorkbenchAtmosphereProps {
  className?: string;
}

export default function WorkbenchAtmosphere({ className = "" }: WorkbenchAtmosphereProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0d0d0c] select-none ${className}`}
      aria-hidden="true"
    >
      {/* ── Subdued Volumetric Ambient Breathing Glow (100% Seamless Sine Loop) ── */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* Soft, dark, muted central ambient pool */}
        <div
          className="w-[900px] h-[550px] rounded-full blur-[140px] will-change-transform pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(230, 223, 204, 0.07) 0%, rgba(230, 223, 204, 0.04) 40%, rgba(15, 23, 42, 0.02) 70%, transparent 100%)",
            animation: "workbenchPulse 10s ease-in-out infinite",
          }}
        />

        {/* Secondary subtle top horizon glow */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[360px] rounded-full blur-[120px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(14, 165, 233, 0.05) 0%, rgba(30, 41, 59, 0.03) 50%, transparent 80%)",
            animation: "workbenchHorizon 14s ease-in-out infinite",
          }}
        />
      </div>

      {/* ── Precision Engineering Workbench Grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.016) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.016) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      {/* ── Subtle Technical Precision Stamps in Margins ── */}
      <div className="absolute top-4 left-6 text-[9px] font-mono text-[#334155] select-none tracking-wider pointer-events-none">
        SYS.READY // 0x01
      </div>
      <div className="absolute top-4 right-6 text-[9px] font-mono text-[#334155] select-none tracking-wider pointer-events-none">
        CORE.STABLE
      </div>
      <div className="absolute bottom-4 left-6 text-[9px] font-mono text-[#334155] select-none tracking-wider pointer-events-none">
        LATENCY.SUB_200MS
      </div>
      <div className="absolute bottom-4 right-6 text-[9px] font-mono text-[#334155] select-none tracking-wider pointer-events-none">
        WORKBENCH.DEV
      </div>

      {/* ── Outer Vignette Falloff ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35 pointer-events-none" />
    </div>
  );
}
