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
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        top: Math.random() * 70,
        left: Math.random() * 100,
        size: Math.random() * 1.6 + 0.6,
        delay: Math.random() * 4,
      })),
    [],
  );
  const drops = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 0.7 + Math.random() * 0.5,
      })),
    [],
  );
  const flakes = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        dur: 5 + Math.random() * 4,
        size: 3 + Math.random() * 3,
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
            width: 72,
            height: 72,
          }}
        >
          <div
            className="absolute inset-0 rounded-full animate-sun-pulse"
            style={{
              background: "radial-gradient(circle, #FDE68A 0%, #FBBF24 55%, rgba(251,191,36,0) 75%)",
              boxShadow: "0 0 60px 20px rgba(251,191,36,0.45)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "linear-gradient(135deg, #FEF3C7, #F59E0B)" }}
          />
        </div>
      )}

      {/* Moon */}
      {hasMoon && (
        <div className="absolute" style={{ top: "20%", right: "12%", width: 56, height: 56 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(226,232,240,0.4) 0%, rgba(226,232,240,0) 70%)",
              boxShadow: "0 0 40px 10px rgba(226,232,240,0.25)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
            style={{ background: "linear-gradient(135deg, #F1F5F9, #CBD5E1)" }}
          >
            <div className="absolute right-[-30%] top-[-10%] h-full w-full rounded-full" style={{ background: "rgba(15,23,42,0.45)" }} />
          </div>
        </div>
      )}

      {/* Clouds */}
      {hasClouds && (
        <>
          <Cloud top="22%" left="-20%" scale={1} opacity={denseClouds ? 0.9 : 0.75} dur={60} />
          <Cloud top="38%" left="-40%" scale={0.7} opacity={denseClouds ? 0.8 : 0.55} dur={80} delay={-20} />
          {denseClouds && <Cloud top="12%" left="-30%" scale={1.2} opacity={0.85} dur={90} delay={-50} />}
          {denseClouds && <Cloud top="55%" left="-25%" scale={0.85} opacity={0.7} dur={70} delay={-10} />}
        </>
      )}

      {/* Rain */}
      {(scene === "rain" || scene === "storm") &&
        drops.map((d) => (
          <span
            key={d.id}
            className="absolute top-[-10%] h-3 w-px animate-rain"
            style={{
              left: `${d.left}%`,
              background: "linear-gradient(180deg, rgba(191,219,254,0) 0%, rgba(191,219,254,0.9) 100%)",
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
            }}
          />
        ))}

      {/* Lightning */}
      {scene === "storm" && (
        <div className="absolute inset-0 animate-lightning" style={{ background: "rgba(255,255,255,0.6)" }} />
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
              opacity: 0.9,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.dur}s`,
            }}
          />
        ))}

      {/* Fog */}
      {scene === "fog" && (
        <>
          <div className="absolute left-0 right-0 h-10 animate-fog" style={{ top: "45%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }} />
          <div className="absolute left-0 right-0 h-8 animate-fog" style={{ top: "62%", animationDelay: "-8s", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }} />
        </>
      )}

      {/* Birds (calm, day-only) */}
      {(scene === "clear-day" || scene === "partly-day" || scene === "sunrise") && (
        <>
          <Bird top="32%" delay={0} dur={26} />
          <Bird top="40%" delay={-12} dur={32} />
        </>
      )}

      {/* Trees + ground silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-16">
        <svg viewBox="0 0 600 80" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
            </linearGradient>
          </defs>
          {/* hills */}
          <path d="M0,55 Q120,30 240,50 T480,45 T600,55 L600,80 L0,80 Z" fill="rgba(0,0,0,0.35)" />
          {/* trees */}
          <g fill="rgba(0,0,0,0.6)">
            <Tree x={60} />
            <Tree x={140} s={0.8} />
            <Tree x={210} s={1.1} />
            <Tree x={320} s={0.9} />
            <Tree x={420} s={1} />
            <Tree x={520} s={0.85} />
          </g>
          <rect x="0" y="50" width="600" height="30" fill="url(#ground)" />
        </svg>
      </div>
    </div>
  );
}

function Tree({ x, s = 1 }: { x: number; s?: number }) {
  const h = 22 * s;
  const w = 14 * s;
  return (
    <g transform={`translate(${x}, ${60 - h})`}>
      <rect x={w / 2 - 1} y={h - 4} width={2} height={6} fill="rgba(0,0,0,0.7)" />
      <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} />
    </g>
  );
}

function Cloud({ top, left, scale = 1, opacity = 0.8, dur = 60, delay = 0 }: { top: string; left: string; scale?: number; opacity?: number; dur?: number; delay?: number }) {
  return (
    <div
      className="absolute animate-cloud"
      style={{ top, left, transform: `scale(${scale})`, opacity, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
    >
      <svg width="140" height="60" viewBox="0 0 140 60" fill="white">
        <ellipse cx="35" cy="40" rx="28" ry="18" />
        <ellipse cx="70" cy="32" rx="34" ry="24" />
        <ellipse cx="105" cy="42" rx="26" ry="16" />
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