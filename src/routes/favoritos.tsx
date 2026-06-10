import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Heart, Image as ImageIcon, Wand2, Flame, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { listAllFavorites } from "@/lib/favorites.functions";

export const Route = createFileRoute("/favoritos")({
  head: () => ({ meta: [{ title: "Favoritos — AI Content Studio" }] }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const fn = useServerFn(listAllFavorites);
  const q = useQuery({ queryKey: ["favorites-all"], queryFn: () => fn() });
  const safe = q.data ?? { images: [], prompts: [], trends: [], characters: [] };
  const data = {
    images: Array.isArray(safe.images) ? safe.images : [],
    prompts: Array.isArray(safe.prompts) ? safe.prompts : [],
    trends: Array.isArray(safe.trends) ? safe.trends : [],
    characters: Array.isArray(safe.characters) ? safe.characters : [],
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Favoritos"
        subtitle="Imágenes, prompts, tendencias y personajes marcados."
      />
      <Tabs defaultValue="imagenes">
        <TabsList>
          <TabsTrigger value="imagenes">
            <ImageIcon className="mr-2 h-3.5 w-3.5" /> Imágenes
            <span className="ml-1 text-muted-foreground">({data.images.length})</span>
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <Wand2 className="mr-2 h-3.5 w-3.5" /> Prompts
            <span className="ml-1 text-muted-foreground">({data.prompts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="tendencias">
            <Flame className="mr-2 h-3.5 w-3.5" /> Tendencias
            <span className="ml-1 text-muted-foreground">({data.trends.length})</span>
          </TabsTrigger>
          <TabsTrigger value="personajes">
            <Users className="mr-2 h-3.5 w-3.5" /> Personajes
            <span className="ml-1 text-muted-foreground">({data.characters.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="imagenes" className="mt-4">
          {data.images.length === 0 ? (
            <Empty label="imágenes" hint="Marca imágenes con el corazón desde Imagen IA." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {data.images.map((i) => (
                <Card key={i.id} className="overflow-hidden border-border/60 bg-card">
                  <div className="aspect-square bg-muted/40">
                    {i.image_base64 ? (
                      <img
                        src={`data:image/png;base64,${i.image_base64}`}
                        alt={i.prompt.slice(0, 50)}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="line-clamp-2 text-[11px] leading-tight">{i.prompt}</p>
                    {i.character_name && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        <Users className="mr-1 inline h-2.5 w-2.5" />
                        {i.character_name}
                      </p>
                    )}
                    <p className="mt-1 text-[9px] text-muted-foreground">
                      {new Date(i.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompts" className="mt-4">
          {data.prompts.length === 0 ? (
            <Empty label="prompts" hint="Marca prompts como favoritos desde Biblioteca." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.prompts.map((p) => (
                <Card key={p.id} className="border-border/60 bg-card">
                  <CardContent className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.category && <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>}
                      {p.platform && <Badge variant="outline" className="text-[10px]">{p.platform}</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tendencias" className="mt-4">
          {data.trends.length === 0 ? (
            <Empty label="tendencias" hint="Marca tendencias en Radar Viral." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.trends.map((t) => (
                <Card key={t.id} className="overflow-hidden border-border/60 bg-card">
                  <div className="aspect-video bg-muted/40">
                    {t.thumbnail_url ? (
                      <img src={t.thumbnail_url} alt={t.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <Flame className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium">{t.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{t.platform} · {t.category}</span>
                      <span>🔥 {t.viral_score}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personajes" className="mt-4">
          {data.characters.length === 0 ? (
            <Empty label="personajes" hint="Marca personajes como favoritos desde Biblioteca." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.characters.map((c) => (
                <Card key={c.id} className="overflow-hidden border-border/60 bg-card">
                  <div className="aspect-video bg-muted/40">
                    {c.reference_image_url ? (
                      <img src={c.reference_image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <Users className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-1 p-3">
                    <p className="line-clamp-1 text-sm font-medium">{c.name}</p>
                    {c.description && (
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">{c.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-muted-foreground">
        ¿Echas en falta algo? Marca elementos como favoritos desde sus respectivas secciones.{" "}
        <Link to="/biblioteca/favoritos" className="underline">Ver biblioteca</Link>
      </p>
    </div>
  );
}

function Empty({ label, hint }: { label: string; hint: string }) {
  return (
    <Card className="border-dashed border-border/60 bg-card/40">
      <CardContent className="p-8 text-center">
        <Heart className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Aún no hay {label} favoritos.</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}