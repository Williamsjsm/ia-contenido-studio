import { useMemo } from "react";

type Scene = "clear-day" | "clear-night" | "partly-day" | "partly-night" | "cloudy" | "fog" | "rain" | "storm" | "snow" | "sunrise";

export function sceneFromCode(code: number | null, isDay: boolean): Scene {
  const h = new Date().getHours();
  if (h >= 5 && h < 7) return "sunrise";
  if (code == null) return isDay ? "clear-day" : "clear-night";
  if (code >= 95) return "storm";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 85 && code <= 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 45 && code <= 48) return "fog";
  if (code === 3) return "cloudy";
  if (code === 1 || code === 2) return isDay ? "partly-day" : "partly-night";
  if (code === 0) return isDay ? "clear-day" : "clear-night";
  return isDay ? "clear-day" : "clear-night";
}

export function WeatherScene({ scene }: { scene: Scene }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        id: i,
        top: Math.random() * 65,
        left: Math.random() * 100,
        size: Math.random() * 1.8 + 0.5,
        delay: Math.random() * 4,
      })),
    [],
  );
  const drops = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.4,
        dur: 0.55 + Math.random() * 0.45,
        len: 10 + Math.random() * 14,
        opacity: 0.45 + Math.random() * 0.45,
      })),
    [],
  );
  const flakes = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        dur: 6 + Math.random() * 5,
        size: 2 + Math.random() * 4,
        drift: (Math.random() - 0.5) * 60,
      })),
    [],
  );
  const bolts = useMemo(
    () =>
      Array.from({ length: 2 }).map((_, i) => ({
        id: i,
        left: 20 + Math.random() * 60,
        delay: i * 3.5 + Math.random() * 2,
      })),
    [],
  );

  const isNight = scene === "clear-night" || scene === "partly-night";
  const hasSun = scene === "clear-day" || scene === "partly-day" || scene === "sunrise";
  const hasMoon = scene === "clear-night" || scene === "partly-night";
  const hasClouds = scene === "partly-day" || scene === "partly-night" || scene === "cloudy" || scene === "rain" || scene === "storm" || scene === "snow" || scene === "fog";
  const denseClouds = scene === "cloudy" || scene === "rain" || scene === "storm" || scene === "snow" || scene === "fog";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Stars (night only) */}
      {isNight &&
        stars.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: 0.85,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

      {/* Sun */}
      {hasSun && (
        <div
          className="absolute"
          style={{
            top: scene === "sunrise" ? "55%" : "18%",
            right: "10%",
            width: 96,
            height: 96,
          }}
        >
          {/* rotating rays */}
          <div className="absolute inset-0 animate-sun-spin">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <g stroke="rgba(254, 240, 138, 0.55)" strokeWidth="2" strokeLinecap="round">
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i * Math.PI * 2) / 12;
                  const x1 = 50 + Math.cos(a) * 38;
                  const y1 = 50 + Math.sin(a) * 38;
                  const x2 = 50 + Math.cos(a) * 48;
                  const y2 = 50 + Math.sin(a) * 48;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
                })}
              </g>
            </svg>
          </div>
          <div
            className="absolute inset-0 rounded-full animate-sun-pulse"
            style={{
              background: "radial-gradient(circle, rgba(254,243,199,0.85) 0%, rgba(251,191,36,0.55) 45%, rgba(251,146,60,0.25) 65%, rgba(251,191,36,0) 78%)",
              boxShadow: "0 0 80px 25px rgba(251,191,36,0.55), 0 0 150px 40px rgba(249,115,22,0.25)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #FFFBEB 0%, #FCD34D 50%, #F59E0B 100%)",
              boxShadow: "inset -4px -6px 10px rgba(180,83,9,0.4), 0 0 20px rgba(253,224,71,0.8)",
            }}
          />
        </div>
      )}

      {/* Moon */}
      {hasMoon && (
        <div className="absolute" style={{ top: "18%", right: "12%", width: 72, height: 72 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(226,232,240,0.55) 0%, rgba(226,232,240,0) 70%)",
              boxShadow: "0 0 60px 18px rgba(226,232,240,0.35), 0 0 120px 30px rgba(148,163,184,0.18)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #F8FAFC 0%, #E2E8F0 60%, #94A3B8 100%)",
              boxShadow: "inset -3px -4px 8px rgba(15,23,42,0.35)",
            }}
          >
            {/* craters */}
            <span className="absolute rounded-full" style={{ top: "20%", left: "25%", width: 5, height: 5, background: "rgba(100,116,139,0.55)" }} />
            <span className="absolute rounded-full" style={{ top: "55%", left: "55%", width: 7, height: 7, background: "rgba(100,116,139,0.45)" }} />
            <span className="absolute rounded-full" style={{ top: "40%", left: "15%", width: 3, height: 3, background: "rgba(100,116,139,0.5)" }} />
            <span className="absolute rounded-full" style={{ top: "65%", left: "30%", width: 4, height: 4, background: "rgba(100,116,139,0.4)" }} />
          </div>
        </div>
      )}

      {/* Clouds */}
      {hasClouds && (
        <>
          <Cloud top="18%" left="-25%" scale={1.1} opacity={denseClouds ? 0.95 : 0.8} dur={75} tint={denseClouds ? "dark" : "light"} />
          <Cloud top="36%" left="-45%" scale={0.75} opacity={denseClouds ? 0.85 : 0.6} dur={95} delay={-25} tint={denseClouds ? "dark" : "light"} />
          {denseClouds && <Cloud top="8%" left="-35%" scale={1.35} opacity={0.9} dur={110} delay={-60} tint="dark" />}
          {denseClouds && <Cloud top="50%" left="-30%" scale={0.95} opacity={0.75} dur={85} delay={-15} tint="dark" />}
        </>
      )}

      {/* Rain */}
      {(scene === "rain" || scene === "storm") &&
        drops.map((d) => (
          <span
            key={d.id}
            className="absolute top-[-10%] w-[1.5px] animate-rain"
            style={{
              left: `${d.left}%`,
              height: `${d.len}px`,
              background: "linear-gradient(180deg, rgba(191,219,254,0) 0%, rgba(219,234,254,0.95) 100%)",
              opacity: d.opacity,
              transform: "rotate(12deg)",
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
            }}
          />
        ))}

      {/* Lightning — full flash + bolt SVG */}
      {scene === "storm" && (
        <>
          <div className="absolute inset-0 animate-lightning" style={{ background: "rgba(255,255,255,0.55)" }} />
          {bolts.map((b) => (
            <svg
              key={b.id}
              className="absolute animate-bolt"
              style={{ top: "10%", left: `${b.left}%`, animationDelay: `${b.delay}s` }}
              width="34"
              height="80"
              viewBox="0 0 34 80"
              fill="none"
            >
              <path d="M18 0 L4 44 L14 44 L8 80 L30 32 L20 32 Z"
                fill="rgba(254,249,195,0.95)"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1"
                style={{ filter: "drop-shadow(0 0 6px rgba(253,224,71,0.9)) drop-shadow(0 0 14px rgba(253,224,71,0.5))" }} />
            </svg>
          ))}
        </>
      )}

      {/* Snow */}
      {scene === "snow" &&
        flakes.map((f) => (
          <span
            key={f.id}
            className="absolute top-[-10%] rounded-full bg-white animate-snow"
            style={{
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              opacity: 0.85,
              boxShadow: "0 0 4px rgba(255,255,255,0.8)",
              ["--drift" as any]: `${f.drift}px`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.dur}s`,
            }}
          />
        ))}

      {/* Fog */}
      {scene === "fog" && (
        <>
          <div className="absolute left-0 right-0 h-14 animate-fog blur-md" style={{ top: "40%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />
          <div className="absolute left-0 right-0 h-10 animate-fog blur-md" style={{ top: "55%", animationDelay: "-6s", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
          <div className="absolute left-0 right-0 h-12 animate-fog blur-md" style={{ top: "68%", animationDelay: "-12s", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }} />
        </>
      )}

      {/* Birds (calm, day-only) */}
      {(scene === "clear-day" || scene === "partly-day" || scene === "sunrise") && (
        <>
          <Bird top="32%" delay={0} dur={26} />
          <Bird top="40%" delay={-12} dur={32} />
          <Bird top="28%" delay={-20} dur={30} />
        </>
      )}

      {/* Trees + ground silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-24">
        <svg viewBox="0 0 600 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
            </linearGradient>
            <linearGradient id="hill2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0.25)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
            </linearGradient>
          </defs>
          {/* back hills */}
          <path d="M0,55 Q120,25 240,50 T480,40 T600,55 L600,100 L0,100 Z" fill="url(#hill2)" />
          {/* front hills */}
          <path d="M0,72 Q100,55 200,68 T400,62 T600,72 L600,100 L0,100 Z" fill="rgba(0,0,0,0.5)" />
          {/* trees on back hill */}
          <g fill="rgba(0,0,0,0.55)">
            <PineTree x={40} y={55} s={0.7} />
            <PineTree x={120} y={50} s={0.6} />
            <PineTree x={260} y={52} s={0.65} />
            <PineTree x={380} y={48} s={0.7} />
            <PineTree x={500} y={54} s={0.6} />
          </g>
          {/* trees on front hill */}
          <g fill="rgba(0,0,0,0.8)">
            <PineTree x={60} y={72} s={1} />
            <PineTree x={140} y={70} s={0.85} />
            <PineTree x={220} y={71} s={1.15} />
            <PineTree x={330} y={68} s={0.95} />
            <PineTree x={430} y={70} s={1.1} />
            <PineTree x={530} y={72} s={0.9} />
          </g>
          <rect x="0" y="60" width="600" height="40" fill="url(#ground)" />
        </svg>
      </div>
    </div>
  );
}

function PineTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const h = 26 * s;
  const w = 16 * s;
  return (
    <g transform={`translate(${x}, ${y - h})`}>
      <rect x={w / 2 - 1.2} y={h - 4} width={2.4} height={7} fill="rgba(0,0,0,0.7)" />
      <polygon points={`${w / 2},0 ${w * 0.95},${h * 0.55} ${w * 0.1},${h * 0.55}`} />
      <polygon points={`${w / 2},${h * 0.3} ${w},${h * 0.85} 0,${h * 0.85}`} />
      <polygon points={`${w / 2},${h * 0.55} ${w * 1.05},${h} ${-w * 0.05},${h}`} />
    </g>
  );
}

function Cloud({ top, left, scale = 1, opacity = 0.8, dur = 60, delay = 0, tint = "light" }: { top: string; left: string; scale?: number; opacity?: number; dur?: number; delay?: number; tint?: "light" | "dark" }) {
  const top1 = tint === "dark" ? "#F1F5F9" : "#FFFFFF";
  const bot1 = tint === "dark" ? "#64748B" : "#CBD5E1";
  return (
    <div
      className="absolute animate-cloud"
      style={{ top, left, transform: `scale(${scale})`, opacity, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
    >
      <svg width="180" height="80" viewBox="0 0 180 80" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" }}>
        <defs>
          <radialGradient id={`cg-${tint}-${dur}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor={top1} stopOpacity="1" />
            <stop offset="70%" stopColor={top1} stopOpacity="0.92" />
            <stop offset="100%" stopColor={bot1} stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <g fill={`url(#cg-${tint}-${dur})`}>
          <ellipse cx="40" cy="55" rx="34" ry="20" />
          <ellipse cx="78" cy="42" rx="40" ry="28" />
          <ellipse cx="120" cy="48" rx="34" ry="24" />
          <ellipse cx="150" cy="56" rx="26" ry="18" />
          <ellipse cx="60" cy="40" rx="22" ry="16" />
        </g>
      </svg>
    </div>
  );
}

function Bird({ top, delay = 0, dur = 28 }: { top: string; delay?: number; dur?: number }) {
  return (
    <div
      className="absolute animate-bird"
      style={{ top, left: "-10%", animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
    >
      <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M1 6 Q5 1 10 6 Q15 1 21 6">
          <animate attributeName="d" dur="0.6s" repeatCount="indefinite"
            values="M1 6 Q5 1 10 6 Q15 1 21 6;
                    M1 5 Q5 6 10 5 Q15 6 21 5;
                    M1 6 Q5 1 10 6 Q15 1 21 6" />
        </path>
      </svg>
    </div>
  );
}