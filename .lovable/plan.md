# Fase Crear — Flujo unificado

Convierto el módulo Crear en un flujo completo y conectado, sin tocar otros módulos.

## 1. Nueva pantalla "Crear Home" (`/crear`)

Nuevo route `src/routes/crear.index.tsx` con 4 tarjetas grandes que actúan como hub:

- **Prompt IA** → `/crear/prompts`
- **Imagen IA** → `/crear/imagen`
- **Video IA** → `/crear/video` (badge "Próximamente", navega pero muestra estado preparado)
- **Personajes** → `/biblioteca/personajes`

Hero con métricas rápidas (prompts, imágenes, personajes, proyectos activos) reusando hooks ya existentes. Sidebar: añado entrada "Crear" como índice del grupo.

## 2. Conexión Prompt → Imagen

En `crear.prompts.tsx`, tras generar variantes añado por cada prompt:

- Copiar (ya existe)
- Guardar (ya existe)
- **Generar Imagen** → navega a `/crear/imagen` con `search={{ promptText, personajeId? }}` y autorrellena el formulario.

En `crear.imagen.tsx` leo `Route.useSearch()` y precargo prompt + personaje al montar.

## 3. Proyecto automático (`creation_projects`)

Nueva tabla:

```
creation_projects
  id uuid pk
  user_id uuid not null            -- single-owner (sin FK a auth.users, como prompts)
  title text
  prompt_id uuid null
  character_id uuid null
  status text default 'draft'      -- draft | image_ready | video_queued | published
  cover_image_id uuid null
  created_at, updated_at
```

```
creation_project_assets
  id uuid pk
  project_id uuid fk creation_projects on delete cascade
  kind text                        -- 'image' | 'flow_job' | 'publication'
  ref_id uuid                      -- id en image_generations / flow_jobs / publication_projects
  created_at
```

GRANTs a `authenticated` + `service_role`, RLS on, política `user_id = OWNER` vía `has_role`-style. Comentario `TODO(auth)` para restaurar FK a `auth.users`.

Server functions en `src/lib/creation-projects.functions.ts`:
- `ensureProjectForPrompt({ promptId, characterId, title })` → crea proyecto draft si no existe.
- `attachAssetToProject({ projectId, kind, refId })`.
- `listCreationProjects()`.

En `image-generation.functions.ts` (función ya existente `saveImageGeneration`), tras insertar imagen llamo internamente a `ensureProjectForPrompt` + `attachAssetToProject('image', generation.id)` y guardo `cover_image_id` si es la primera. Pasos opcionales por `projectId` en input.

## 4. Historial Imagen — acciones

Las acciones (ver, descargar, copiar prompt, usar como referencia, eliminar, selección múltiple) ya se añadieron en iteración previa. Añado únicamente:

- **Favorito** (toggle estrella en miniatura). Nueva columna `is_favorite boolean default false` en `image_generations` (migración) + server fn `toggleImageFavorite`.
- Filtro adicional "Favoritos".

## 5. Crear personaje — múltiples referencias

`virtual_characters` ya admite ref principal. Añado tabla `character_reference_images` (id, character_id fk on delete cascade, storage_path, is_primary, sort_order). En `import-character-dialog.tsx` permito subir N imágenes; al guardar, una marcada como `is_primary` (la actual) y el resto como secundarias. Vista en `biblioteca/personajes` muestra galería.

(Si el alcance se infla, primera entrega: solo backend + alta múltiple; UI de galería en biblioteca queda básica.)

## 6. Preparar Video

En `crear.imagen.tsx` (panel de imagen seleccionada) y en la nueva vista de proyecto, botón **Enviar a Video** que:

- Crea `flow_jobs` row con `status='draft'`, `source_image_id`, `prompt`, `project_id`.
- Navega a `/crear/video` mostrando un estado "Preparado, generación de video próximamente".

No se llama a ningún proveedor de video.

## 7. Build limpio

- Migraciones nuevas con GRANTs.
- Sin tocar módulos fuera de Crear / Biblioteca personajes / image-generation.
- Reutilizo `requireAccess` + single-owner pattern (sin FK a auth.users).
- Verificar tipos `tsc --noEmit` (lo corre el harness).

## Archivos a crear / editar

Crear:
- `src/routes/crear.tsx` (layout con `<Outlet/>`) — si no existe, o convertir si choca; actualmente las rutas son `crear.prompts.tsx` planas sin layout, así que sólo añado `crear.index.tsx`.
- `src/routes/crear.index.tsx`
- `src/lib/creation-projects.functions.ts`
- `supabase/migrations/<ts>_creation_projects.sql`
- `supabase/migrations/<ts>_character_references_and_image_favorites.sql`

Editar:
- `src/lib/navigation.ts` (entrada "Crear" en sidebar)
- `src/routes/crear.prompts.tsx` (botón Generar Imagen + navegación con search)
- `src/routes/crear.imagen.tsx` (leer search params, favorito, botón Enviar a Video, integración proyecto)
- `src/routes/crear.video.tsx` (estado "preparado" + recepción de flow draft)
- `src/lib/image-generation.functions.ts` (ensure project + favorite toggle + filtros)
- `src/components/import-character-dialog.tsx` (múltiples referencias)
- `src/routes/biblioteca.personajes.tsx` (mostrar galería de referencias — mínimo)

## Notas técnicas

- Mantengo modo single-owner (`OWNER_USER_ID` / `FALLBACK_OWNER_ID`) en todas las nuevas server fns, con `TODO(auth)`.
- RLS habilitada pero policies usan `user_id = current_setting('app.owner_id', true)::uuid` no es viable; uso policy permisiva `using (true)` solo para `service_role` (que es quien accede vía `supabaseAdmin`), y restrinjo `authenticated/anon` con `using (false)` — coincide con patrón de `prompts` actual.
- No genero video real; `flow_jobs.status='draft'` queda esperando worker futuro.
