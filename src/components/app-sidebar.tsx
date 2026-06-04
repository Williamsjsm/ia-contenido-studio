import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { navGroups } from "@/lib/navigation";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/70 pb-2.5">
        <Link
          to="/"
          aria-label="AI Content Studio — Inicio"
          className="group flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition-colors hover:bg-sidebar-accent/50"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-[18px] w-[18px] text-primary-foreground" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[13.5px] font-semibold tracking-tight">AI Content</span>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Studio
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 py-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active =
                    item.url === "/"
                      ? path === "/"
                      : item.url.startsWith("/biblioteca")
                        ? path.startsWith("/biblioteca")
                        : path.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="group/item relative h-9 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:font-medium data-[active=true]:shadow-[var(--shadow-soft)]"
                      >
                        <Link to={item.url} className="flex items-center gap-2.5">
                          <span
                            className={`absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all duration-200 ${
                              active ? "opacity-100" : "opacity-0 scale-y-0"
                            }`}
                          />
                          <item.icon
                            className={`h-[16px] w-[16px] shrink-0 transition-colors duration-200 ${
                              active
                                ? "text-primary"
                                : "text-muted-foreground group-hover/item:text-foreground"
                            }`}
                            strokeWidth={2}
                          />
                          {!collapsed && <span className="text-[13px]">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
