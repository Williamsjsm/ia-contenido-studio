import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Toaster } from "@/components/ui/sonner";
import { getAccessStatus } from "@/lib/access-control.functions";
import { Loader2 } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Prompt Studio — Genera prompts y videos con IA" },
      { name: "description", content: "Crea prompts optimizados para Flow, YouTube, Veo y Kling, gestiona tu biblioteca y descubre tendencias con IA." },
      { property: "og:title", content: "Prompt Studio — Genera prompts y videos con IA" },
      { property: "og:description", content: "Crea prompts optimizados para Flow, YouTube, Veo y Kling, gestiona tu biblioteca y descubre tendencias con IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "twitter:title", content: "Prompt Studio — Genera prompts y videos con IA" },
      { property: "twitter:description", content: "Crea prompts optimizados para Flow, YouTube, Veo y Kling, gestiona tu biblioteca y descubre tendencias con IA." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AccessGate />
    </QueryClientProvider>
  );
}

function AccessGate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const statusFn = useServerFn(getAccessStatus);
  const [hasFallbackToken, setHasFallbackToken] = useState(false);

  useEffect(() => {
    setHasFallbackToken(Boolean(window.sessionStorage.getItem("app_session_token")));
  }, [pathname]);

  const { data, isLoading } = useQuery({
    queryKey: ["access", "status"],
    queryFn: () => statusFn(),
    staleTime: 10_000,
    retry: false,
  });

  const isAcceso = pathname === "/acceso";
  const authed = data?.authenticated === true || hasFallbackToken;

  useEffect(() => {
    if (isLoading) return;
    if (!authed && !isAcceso) {
      void navigate({ to: "/acceso", replace: true });
    }
  }, [authed, isAcceso, isLoading, navigate]);

  // Página de acceso: render sin shell (ni sidebar ni topbar).
  if (isAcceso) {
    return (
      <div className="dark min-h-screen w-full bg-background text-foreground">
        <Outlet />
        <Toaster />
      </div>
    );
  }

  // Mientras se resuelve / redirige, evitar parpadeo del shell.
  if (isLoading || !authed) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground dark">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground dark">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
