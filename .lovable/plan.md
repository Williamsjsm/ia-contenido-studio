# v1.4.3 — Performance & Loading Optimization

Optimizar tiempos de carga y navegación sin tocar diseño ni lógica de negocio. Trabajo dividido en fases independientes y verificables.

## Fase 1 — Configuración global de TanStack Query y Router

- Ajustar `getRouter` (`src/router.tsx`) y el `QueryClient`:
  - `defaultPreloadStaleTime: 0` (ya está) + `defaultPreload: "intent"` para prefetch al hover.
  - `QueryClient` con defaults: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`, `retry: 1`.
- Sidebar (`app-sidebar.tsx`): los `<Link>` ya usan TanStack Router; con `defaultPreload: "intent"` se obtiene prefetch automático al hover/focus de cada item del sidebar — sin cambios extra.

## Fase 2 — Hooks de datos a TanStack Query

Reescribir los hooks "mock" para que pasen por Query (cache compartida, no refetch innecesario, listo para conectar a server functions reales):

- `use-dashboard.ts`, `use-trends.ts`, `use-inspiration.ts`, `use-publishing.ts`:
  - Usar `useQuery` con `queryKey` estable, `staleTime: 60_000`, `placeholderData: keepPreviousData`.
  - Mantener la misma forma pública (`data/isLoading/error/isEmpty`) — los consumidores no cambian.

## Fase 3 — Historial de Imágenes y Videos (biblioteca)

- `biblioteca.imagenes.tsx` y `biblioteca.videos.tsx`:
  - Paginación en cliente: mostrar primero 20 items, botón "Cargar más" (+20) usando `useState` para el límite visible. (Los datos vienen ya de `library-data`; mantenemos la API simple, lista para sustituir por infinite query cuando exista backend real.)
  - Thumbnails con `loading="lazy"` y `decoding="async"` donde haya `<img>`. Para los divs con `background-gradient` actuales se añade `content-visibility: auto` para reducir trabajo de render fuera de viewport.
  - Mantener filtros, favoritos y selección.

## Fase 4 — Dashboard

- En el componente del dashboard, separar bloques en queries independientes (stats, trends, inspiration, publishing) con sus propios `Suspense`/skeletons ligeros, de modo que un fallo en uno no bloquee al resto.
- `staleTime: 60_000`, `retry: 1`, timeout corto en server fn (`getDashboardStats` ya tiene `withTimeout` 2.5s — lo dejamos).

## Fase 5 — Imagen IA, Flow Center, Video Hub

- `crear.imagen.tsx`: memoizar con `useMemo` el prompt final que combina personaje + prompt base; `useCallback` en handlers; invalidar solo la query del historial tras generar (no global).
- `flow-continuity-studio.tsx`: memoizar `buildProviderPack` y los prompts de continuidad con `useMemo` basados en inputs reales (last frame, preset, provider).
- Video Hub: lazy load del panel de export history con `React.lazy` + `Suspense`.

## Fase 6 — Signed URLs

- Crear helper `src/lib/signed-url-cache.ts`: cache en memoria `Map<path, { url, expiresAt }>` con TTL configurable (default 50 min para URLs de 1h). Función `getSignedUrl(path, ttlSec)` que reusa si no expiró. Reemplazar llamadas directas en los componentes de galería/thumbs.

## Fase 7 — Code splitting de rutas pesadas

- TanStack Router ya hace auto code-splitting de componentes por ruta. Verificamos que no se exporten funciones-componente desde route files (regla del code-splitter). Convertir cualquier `export function PageComponent` en función local + `component: PageComponent`.
- Para componentes muy pesados dentro de una ruta (ej. `video-intelligence-panel`, `video-export-pack`, `flow-continuity-studio`), envolverlos en `React.lazy` + `Suspense` cuando se monten condicionalmente.

## Fase 8 — Medición ligera (dev)

- `src/lib/perf.ts`: helper `measure(label, fn)` que loguea `performance.now()` solo si `import.meta.env.DEV`. Instrumentar:
  - carga inicial de dashboard
  - carga de historial imágenes / videos
  - cambio de ruta (via router subscribe a `onResolved`).

## Fuera de alcance (no se toca)

- Diseño visual / bordes de tarjetas / tokens.
- Lógica de generación, importación de personajes, análisis IA, publicación.
- Esquemas de BD, RLS, edge functions.

## Verificación

- Build limpio (lo corre el harness).
- Smoke test manual con `code--read_console_logs` y `read_network_requests` tras navegar Dashboard → Imagen IA → Flow Center → Biblioteca.
- Confirmar que no hay refetch en focus y que el segundo render de cada ruta no dispara queries nuevas (cache hit).

¿Apruebas este plan para empezar a implementar?
