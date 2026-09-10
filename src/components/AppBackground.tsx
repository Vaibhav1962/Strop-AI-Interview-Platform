type AppBackgroundProps = {
  variant?: "default" | "immersive";
};

const particles = [
  { left: "12%", top: "70%", size: 5, delay: "0s" },
  { left: "24%", top: "80%", size: 3, delay: "1.2s" },
  { left: "38%", top: "65%", size: 4, delay: "2.4s" },
  { left: "55%", top: "85%", size: 3, delay: "0.8s" },
  { left: "68%", top: "72%", size: 5, delay: "3.1s" },
  { left: "80%", top: "78%", size: 3, delay: "1.8s" },
  { left: "90%", top: "68%", size: 4, delay: "2.9s" },
];

export default function AppBackground({ variant = "default" }: AppBackgroundProps) {
  const immersive = variant === "immersive";

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className={`signal-grid ${immersive ? "signal-grid-immersive" : ""}`} />
      {!immersive && (
        <>
          <div className="signal-blob signal-blob-blue" />
          <div className="signal-blob signal-blob-indigo" />
          {particles.map((p, i) => (
            <div
              key={i}
              className="signal-particle"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
              }}
            />
          ))}
        </>
      )}
      <svg className={`signal-svg ${immersive ? "signal-svg-immersive" : ""}`} viewBox="0 0 2880 220" preserveAspectRatio="none">
        <path
          className="signal-flowline"
          d="M0,90 C160,40 320,140 480,90 C640,40 800,140 960,90 C1120,40 1280,140 1440,90 C1600,40 1760,140 1920,90 C2080,40 2240,140 2400,90 C2560,40 2720,140 2880,90"
          stroke="#3b82f6"
        />
        <path
          className="signal-flowline"
          d="M0,130 C160,170 320,90 480,130 C640,170 800,90 960,130 C1120,170 1280,90 1440,130 C1600,170 1760,90 1920,130 C2080,170 2240,90 2400,130 C2560,170 2720,90 2880,130"
          stroke="#818cf8"
          style={{ animationDelay: "-1.6s" }}
        />
        <path
          className="signal-flowline"
          d="M0,165 C160,190 320,140 480,165 C640,190 800,140 960,165 C1120,190 1280,140 1440,165 C1600,190 1760,140 1920,165 C2080,190 2240,140 2400,165 C2560,190 2720,140 2880,165"
          stroke="#34d399"
          style={{ animationDelay: "-3.2s" }}
        />
      </svg>
    </div>
  );
}
