-- Drop FK to auth.users while we run in single-owner mode (no real auth yet).
ALTER TABLE public.prompts DROP CONSTRAINT IF EXISTS prompts_user_id_fkey;

-- Seed one valid sample row so the library has real data to render.
INSERT INTO public.prompts (
  user_id, title, category, platform, style, language, duration,
  content, original_prompt, flow_prompt, youtube_prompt, veo_prompt, kling_prompt
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Pitahaya tropical (semilla)',
  'Pitahaya tropical',
  'youtube',
  'cinematic',
  'es',
  '8',
  'Primer plano cinematográfico de una pitahaya tropical flotando sobre agua cristalina con reflejos suaves del sol.',
  'Primer plano cinematográfico de una pitahaya tropical flotando sobre agua cristalina con reflejos suaves del sol.',
  'Escena: superficie de agua cristalina. Sujeto: pitahaya tropical flotando. Acción: ondas suaves. Cámara: primer plano, ángulo bajo. Iluminación: luz solar natural. Atmósfera: calma exótica.',
  '¡Frescura tropical en 8 segundos! Mira cómo una pitahaya vibrante flota sobre agua cristalina. Suscríbete para más visuales relajantes.',
  'Plano medio, lente anamórfica 50mm, dolly lento hacia adelante revelando la superficie del agua, luz cenital tenue, ritmo contemplativo.',
  'Movimiento sutil de pitahaya deslizándose sobre agua inmaculada, transición a vista submarina breve, colores saturados, alta definición, 8 segundos.'
)
ON CONFLICT DO NOTHING;