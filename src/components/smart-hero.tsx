import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Image as ImageIcon, Radar, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherScene, sceneFromCode } from "@/components/weather-scene";

type Geo = { city: string; region: string; country: string; lat: number; lon: number };
type Weather = { temp: number; code: number; isDay: boolean };

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

// Open-Meteo WMO weather codes → {label, emoji}
function describeWeather(code: number, isDay: boolean): { label: string; emoji: string } {
  if (code === 0) return isDay ? { label: "Despejado", emoji: "☀️" } : { label: "Noche despejada", emoji: "🌙" };
  if (code <= 2) return isDay ? { label: "Parcialmente nublado", emoji: "⛅" } : { label: "Noche con nubes", emoji: "🌙" };
  if (code === 3) return { label: "Nublado", emoji: "☁️" };
  if (code >= 45 && code <= 48) return { label: "Niebla", emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Llovizna", emoji: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Lluvia", emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Nieve", emoji: "❄️" };
  if (code >= 80 && code <= 82) return { label: "Chubascos", emoji: "🌦️" };
  if (code >= 85 && code <= 86) return { label: "Nevadas", emoji: "🌨️" };
  if (code >= 95) return { label: "Tormenta", emoji: "⛈️" };
  return { label: "Clima actual", emoji: "🌡️" };
}

function weatherGradient(code: number | null, isDay: boolean): string {
  // Sunrise window
  const h = new Date().getHours();
  if (h >= 5 && h < 7) return "linear-gradient(135deg, #FB7185, #F59E0B)";
  if (!isDay) return "linear-gradient(135deg, #7C3AED, #312E81)";
  if (code == null) return "var(--gradient-primary)";
  if (code >= 95) return "linear-gradient(135deg, #1E293B, #0F172A)";
  if (code >= 51 && code <= 82) return "linear-gradient(135deg, #1E3A8A, #0F172A)";
  if (code === 3 || (code >= 45 && code <= 48)) return "linear-gradient(135deg, #64748B, #334155)";
  if (code === 0 || code <= 2) return "linear-gradient(135deg, #F59E0B, #F97316)";
  return "var(--gradient-primary)";
}

async function fetchGeo(): Promise<Geo | null> {
  try {
    const r = await fetch("https://ipapi.co/json/");
    if (!r.ok) return null;
    const j: any = await r.json();
    if (!j || typeof j.latitude !== "number") return null;
    return {
      city: j.city || "",
      region: j.region || j.region_code || "",
      country: j.country_name || j.country || "",
      lat: j.latitude,
      lon: j.longitude,
    };
  } catch {
    return null;
  }
}

async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j: any = await r.json();
    const c = j?.current;
    if (!c) return null;
    return { temp: Math.round(c.temperature_2m), code: c.weather_code, isDay: c.is_day === 1 };
  } catch {
    return null;
  }
}

const HALF_HOUR = 30 * 60 * 1000;

export function SmartHero({ name = "Williams", subtext }: { name?: string; subtext?: string }) {
  const geoQ = useQuery({
    queryKey: ["hero", "geo"],
    queryFn: fetchGeo,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const geo = geoQ.data ?? null;

  const weatherQ = useQuery({
    queryKey: ["hero", "weather", geo?.lat, geo?.lon],
    queryFn: () => fetchWeather(geo!.lat, geo!.lon),
    enabled: !!geo,
    staleTime: HALF_HOUR,
    refetchInterval: HALF_HOUR,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const weather = weatherQ.data ?? null;

  // Tick to update greeting if hour changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const isDay = weather?.isDay ?? (new Date().getHours() >= 6 && new Date().getHours() < 20);
  const bg = useMemo(() => weatherGradient(weather?.code ?? null, isDay), [weather, isDay]);
  const desc = weather ? describeWeather(weather.code, weather.isDay) : null;
  const scene = useMemo(() => sceneFromCode(weather?.code ?? null, isDay), [weather, isDay]);

  const locationLine = geo
    ? [geo.city, [geo.region, geo.country].filter(Boolean).join(" - ")].filter(Boolean).join(", ")
    : null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/60 p-6 sm:p-8 animate-fade-in transition-[background] duration-700 min-h-[220px]"
      style={{ backgroundImage: bg }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-background/0 to-background/30" aria-hidden />
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" aria-hidden style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <WeatherScene scene={scene} />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 text-primary-foreground">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}, {name} <span className="inline-block">👋</span>
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] sm:text-sm opacity-95">
            {geoQ.isLoading ? (
              <span className="inline-flex items-center gap-1.5 opacity-80">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Detectando ubicación…
              </span>
            ) : locationLine ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {locationLine}
              </span>
            ) : null}

            {weather && desc && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{desc.emoji}</span>
                  <span className="font-semibold">{weather.temp}°C</span>
                </span>
                <span className="inline-flex items-center gap-1.5 opacity-90">{desc.label}</span>
              </>
            )}
          </div>

          {subtext && <p className="pt-1 text-[12.5px] opacity-80">{subtext}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" variant="secondary" className="h-11 rounded-xl">
            <Link to="/crear/prompts"><Sparkles className="mr-2 h-4 w-4" />Crear prompt</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-11 rounded-xl bg-background/20 text-primary-foreground hover:bg-background/30">
            <Link to="/crear/imagen"><ImageIcon className="mr-2 h-4 w-4" />Generar imagen</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-11 rounded-xl bg-background/20 text-primary-foreground hover:bg-background/30">
            <Link to="/investigar/tendencias"><Radar className="mr-2 h-4 w-4" />Radar Viral</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}