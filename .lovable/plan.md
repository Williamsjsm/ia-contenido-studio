# Montar el proyecto `ai-content-creator-hub-main`

Lovable Cloud ya está habilitado. Falta copiar los archivos del zip al workspace y aplicar la migración de base de datos.

## Pasos

1. **Sincronizar archivos** del zip a `/dev-server/` con `rsync`, excluyendo:
   - `.git`, `node_modules`, `bun.lock` (se regenera)
   - `.env` y `supabase/config.toml` (gestionados por Cloud)
   - `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher}.ts` (auto-generados por Cloud)
   - `supabase/migrations/` (se aplica vía herramienta de migración)

   Esto incluye: `src/routes/` (20 rutas), `src/components/`, `src/hooks/`, `src/lib/`, `src/assets/`, `src/styles.css`, `src/integrations/supabase/types.ts`, y configs (`package.json`, `tsconfig.json`, `vite.config.ts`, `components.json`, `eslint.config.js`, `bunfig.toml`).

2. **Instalar dependencias** con `bun install` para alinear el lockfile con el nuevo `package.json`.

3. **Aplicar la migración** del zip (`20260531145546_*.sql`, 171 líneas) usando la herramienta de migración de Cloud, creando un nuevo archivo timestamped en `supabase/migrations/`.

4. **Verificar** que el dev server arranca y la preview carga la home del proyecto.

## Notas

- `routeTree.gen.ts` se copia tal cual; se regenerará en el primer build si hace falta.
- Si la migración requiere ajustes (p. ej. grants faltantes para PostgREST), se añaden en el mismo paso.
- Secrets adicionales (APIs externas) tendrán que añadirse después si el proyecto los usa.
