import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FolderKanban,
  FolderOpen,
  GanttChart,
  GitBranch,
  Landmark,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  LogOut,
  Moon,
  Package,
  ScrollText,
  Settings,
  Sun,
  Tags,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

const THEME_KEY = "meucrm-theme";

type NavItem = { to: string; label: string; icon: LucideIcon };
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    id: "crm",
    label: "CRM",
    icon: Building2,
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/empresas", label: "Empresas", icon: Building2 },
      { to: "/contatos", label: "Contatos", icon: Users },
      { to: "/negocios", label: "Negócios", icon: Briefcase },
      { to: "/produtos", label: "Produtos", icon: Package },
      { to: "/lembretes", label: "Lembretes", icon: Bell },
    ],
  },
  {
    id: "projetos",
    label: "Projetos",
    icon: FolderKanban,
    items: [
      { to: "/projetos", label: "Lista de projetos", icon: FolderOpen },
      { to: "/projetos/tarefas", label: "Todas as tarefas", icon: ListChecks },
      { to: "/projetos/kanban", label: "Kanban geral", icon: Columns3 },
      { to: "/projetos/timeline", label: "Timeline geral", icon: GanttChart },
      { to: "/projetos/minhas-tarefas", label: "Minhas tarefas", icon: ListTodo },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: Landmark,
    items: [
      { to: "/contas-receber", label: "Contas a receber", icon: ArrowDownCircle },
      { to: "/contas-pagar", label: "Contas a pagar", icon: ArrowUpCircle },
      { to: "/contas-bancarias", label: "Contas bancárias", icon: Landmark },
    ],
  },
  {
    id: "config",
    label: "Config",
    icon: Settings,
    items: [
      { to: "/config/pipelines", label: "Pipelines", icon: GitBranch },
      { to: "/config/categorias", label: "Categorias", icon: Tags },
      { to: "/config/usuarios", label: "Usuários", icon: Users },
      { to: "/config/log", label: "Log", icon: ScrollText },
    ],
  },
];

function navClassName({
  isActive,
  collapsed,
}: {
  isActive: boolean;
  collapsed?: boolean;
}) {
  return cn(
    "flex items-center gap-3 rounded-lg text-sm transition-colors",
    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
    isActive
      ? "bg-white/12 text-white"
      : "text-white/70 hover:bg-white/[0.06] hover:text-white",
  );
}

function SidebarGroupBlock({
  group,
  collapsed,
}: {
  group: NavGroup;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const GroupIcon = group.icon;

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const handleTriggerEnter = () => {
    cancelClose();
    if (collapsed && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setFlyoutPos({ top: rect.top, left: rect.right });
    }
    setOpen(true);
  };

  const handleFlyoutEnter = () => {
    cancelClose();
  };

  const handleFlyoutLeave = () => {
    scheduleClose();
  };

  useEffect(() => {
    return () => cancelClose();
  }, []);

  if (!collapsed) {
    return (
      <div className="space-y-1">
        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {group.label}
        </p>
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                navClassName({ isActive, collapsed: false })
              }
              end={item.to === "/" || item.to === "/projetos"}
            >
              <Icon className="size-[18px] shrink-0 opacity-90" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={triggerRef}
      className="relative flex justify-center py-1"
      onMouseEnter={handleTriggerEnter}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="true"
        aria-label={`Menu ${group.label}`}
        className={cn(
          "flex size-10 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white",
          open && "bg-white/[0.08] text-white",
        )}
      >
        <GroupIcon className="size-[20px] shrink-0" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              role="region"
              aria-label={group.label}
              className="fixed z-[9999] min-w-[220px] rounded-xl border border-white/10 bg-[#252830] py-2 shadow-2xl"
              style={{ top: flyoutPos.top, left: flyoutPos.left }}
              onMouseEnter={handleFlyoutEnter}
              onMouseLeave={handleFlyoutLeave}
            >
              <p className="border-b border-white/10 px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-white/50">
                {group.label}
              </p>
              <div className="p-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-white/12 text-white"
                            : "text-white/75 hover:bg-white/[0.06] hover:text-white",
                        )
                      }
                      end={item.to === "/" || item.to === "/projetos"}
                      onClick={() => setOpen(false)}
                    >
                      <Icon className="size-4 shrink-0 opacity-90" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function displayNameFromUser(user: Record<string, unknown> | null): string {
  if (!user) return "Usuário";
  const name = user.name;
  if (typeof name === "string" && name.trim()) return name;
  const email = user.email;
  if (typeof email === "string" && email.trim()) return email;
  return "Usuário";
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppLayout() {
  const navigate = useNavigate();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark = stored === "dark" || (stored !== "light" && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  const name = displayNameFromUser(user);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-[100] flex flex-col border-r border-white/5 bg-[#1a1d26] transition-[width] duration-200 ease-out",
          sidebarCollapsed ? "w-[60px]" : "w-[220px]",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-white/10",
            sidebarCollapsed ? "justify-center px-0" : "justify-between px-4",
          )}
        >
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expandir menu"
              className="flex size-10 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <ChevronRight className="size-5" />
            </button>
          ) : (
            <>
              <span className="text-lg font-bold tracking-tight text-white">
                MeuCRM
              </span>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Recolher menu"
                className="flex size-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
            </>
          )}
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-2">
          {navGroups.map((group) => (
            <SidebarGroupBlock
              key={group.id}
              group={group}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>
      </aside>

      <div
        className={cn(
          "flex min-h-screen min-w-0 w-full flex-1 flex-col transition-[padding] duration-200 ease-out",
          sidebarCollapsed ? "pl-[60px]" : "pl-[220px]",
        )}
      >
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
          <div className="max-w-md flex-1">
            <GlobalSearch />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? "Tema claro" : "Tema escuro"}
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-accent-soft)]"
          >
            {dark ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-accent)] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                aria-label="Menu do usuário"
              >
                {user ? (
                  <span>{userInitials(name)}</span>
                ) : (
                  <User className="size-5 text-[var(--color-muted)]" />
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={8}
                align="end"
                className="z-[300] min-w-[200px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg"
              >
                <DropdownMenu.Label className="px-3 py-2 text-sm font-medium text-[var(--color-text)]">
                  {name}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-accent-soft)]"
                  onSelect={() => navigate("/perfil")}
                >
                  <User className="size-4 text-[var(--color-muted)]" />
                  Perfil
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-accent-soft)]"
                  onSelect={() => logout()}
                >
                  <LogOut className="size-4 text-[var(--color-muted)]" />
                  Sair
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>
        <main className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
