import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Search,
  Bell,
  LogOut,
  User,
  Settings,
  Plug,
  Sparkles,
  HelpCircle,
} from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { primaryRoutes } from "@/lib/navigation";

// Simulated integration state — replace with real API later.
const connectedIntegrations = ["ChatGPT", "Google AI", "Flow"] as const;

const notifications = [
  {
    id: 1,
    title: "Render completado",
    desc: "Restauraciones vintage · 8s ready en Flow Center.",
    time: "hace 4 min",
    unread: true,
  },
  {
    id: 2,
    title: "Tendencia detectada",
    desc: "Frutas medicinales IA +212% esta semana.",
    time: "hace 1 h",
    unread: true,
  },
  {
    id: 3,
    title: "Publicación programada",
    desc: "TikTok · Pitahaya que cura · Hoy 19:30.",
    time: "hace 3 h",
    unread: false,
  },
];

const placeholderToast = () =>
  toast("Función preparada para integración futura", {
    description: "Disponible cuando se conecte la API real.",
  });

export function TopBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => n.unread).length;
  const integrationCount = connectedIntegrations.length;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const grouped = primaryRoutes.reduce<Record<string, typeof primaryRoutes>>((acc, r) => {
    (acc[r.group] ||= []).push(r);
    return acc;
  }, {});

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/50 bg-background/70 px-3 backdrop-blur-xl sm:px-4">
      <SidebarTrigger className="text-muted-foreground transition-colors hover:text-foreground" />

      {/* Global search */}
      <button
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full max-w-md items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 text-left text-[13px] text-muted-foreground transition-all hover:border-border hover:bg-card/70 hover:text-foreground"
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="flex-1 truncate">Buscar en el estudio…</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* System status */}
        <div className="hidden items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 lg:flex">
          <div className="flex -space-x-1">
            {connectedIntegrations.map((name, i) => (
              <span
                key={name}
                title={`${name} conectado`}
                className="h-2 w-2 rounded-full bg-primary ring-2 ring-card shadow-[0_0_6px_oklch(0.79_0.155_70_/_60%)]"
                style={{ zIndex: connectedIntegrations.length - i }}
              />
            ))}
          </div>
          <span className="text-[11.5px] font-medium tracking-tight text-muted-foreground">
            {integrationCount} conectadas
          </span>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground md:flex">
          <span className="status-dot-success" aria-hidden />
          <span className="hidden font-medium tracking-tight text-foreground/80 md:inline">
            Sistema activo
          </span>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-xl text-muted-foreground hover:bg-card/60 hover:text-foreground"
              aria-label="Notificaciones"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.79_0.155_70_/_70%)]" />
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
              <span className="text-eyebrow text-muted-foreground">Notificaciones</span>
              {unreadCount > 0 && (
                <Badge variant="brand">{unreadCount} nuevas</Badge>
              )}
            </div>
            <ul className="max-h-80 divide-y divide-border/50 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="relative flex gap-3 px-3 py-3 transition-colors hover:bg-card/60"
                >
                  {n.unread && (
                    <span className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_oklch(0.79_0.155_70_/_80%)]" />
                  )}
                  <div className="ml-2 flex-1 space-y-1">
                    <p className="text-[13px] font-medium leading-tight text-foreground">
                      {n.title}
                    </p>
                    <p className="text-[12px] leading-snug text-muted-foreground">{n.desc}</p>
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
                      {n.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border/60 p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center rounded-lg text-[12.5px]"
                onClick={placeholderToast}
              >
                Ver todas
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-xl border border-transparent p-0.5 pr-2 transition-all hover:border-border/60 hover:bg-card/60"
              aria-label="Menú de usuario"
            >
              <Avatar className="h-8 w-8 ring-1 ring-border/60">
                <AvatarFallback className="bg-[image:var(--gradient-primary)] text-[12px] font-semibold text-primary-foreground">
                  AC
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-[12.5px] font-medium tracking-tight text-foreground/80 sm:inline">
                Creator
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="text-[13px] font-semibold tracking-tight">AI Creator</span>
              <span className="text-[11.5px] font-normal text-muted-foreground">
                Espacio privado
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/configuracion" })}>
              <User className="h-4 w-4" /> Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/configuracion" })}>
              <Settings className="h-4 w-4" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/integraciones" })}>
              <Plug className="h-4 w-4" /> Integraciones
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={placeholderToast}>
              <HelpCircle className="h-4 w-4" /> Ayuda
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={placeholderToast}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Command palette */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas, proyectos, acciones…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {Object.entries(grouped).map(([group, items], idx) => (
            <div key={group}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.url}
                    value={`${group} ${item.title}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate({ to: item.url });
                    }}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Acciones rápidas">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/crear/prompts" });
              }}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Crear nuevo prompt</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
