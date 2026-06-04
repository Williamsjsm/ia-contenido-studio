import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — AI Content Studio" }] }),
  component: Configuracion,
});

function Configuracion() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 lg:p-10">
      <PageHeader title="Configuración" subtitle="Personaliza tu espacio de trabajo." />
      <Card className="border-border/60 bg-card">
        <CardHeader><CardTitle className="text-base">Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Nombre</Label><Input placeholder="Tu nombre" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="tu@email.com" /></div>
          <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">Guardar cambios</Button>
        </CardContent>
      </Card>
      <Card className="border-border/60 bg-card">
        <CardHeader><CardTitle className="text-base">Preferencias</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            "Notificaciones de tendencias",
            "Auto-guardar resultados",
            "Mostrar accesos rápidos en Dashboard",
          ].map((p) => (
            <div key={p} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3">
              <span className="text-sm">{p}</span>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}