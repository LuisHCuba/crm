import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
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
const NAV_OPEN_PREFIX = "meucrm-nav-open:";

type NavItem = { to: string; label: string; icon: LucideIcon; adminOnly?: boolean };
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => {
    if (item.to === "/") return pathname === "/";
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  });
}

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
      { to: "/config/usuarios", label: "Usuários", icon: Users, adminOnly: true },
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
    "flex items-center gap-3 rounded-[var(--radius-lg)] text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
    isActive
      ? "bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-active-text)]"
      : "text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-text)]",
  );
}

function SidebarGroupBlock({
  group,
  collapsed,
  containsActive,
}: {
  group: NavGroup;
  collapsed: boolean;
  containsActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const GroupIcon = group.icon;

  const [sectionOpen, setSectionOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(`${NAV_OPEN_PREFIX}${group.id}`);
    if (stored === "1") return true;
    if (stored === "0") return false;
    return containsActive;
  });

  const toggleSection = () => {
    setSectionOpen((prev) => {
      const next = !prev;
      localStorage.setItem(`${NAV_OPEN_PREFIX}${group.id}`, next ? "1" : "0");
      return next;
    });
  };

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
        <button
          type="button"
          onClick={toggleSection}
          aria-expanded={sectionOpen ? "true" : "false"}
          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-sidebar-faint)] outline-none transition-colors hover:text-[var(--color-sidebar-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <span className="flex items-center gap-2 truncate">
            <GroupIcon className="size-[14px] shrink-0 opacity-80" aria-hidden />
            {group.label}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              !sectionOpen && "-rotate-90",
            )}
            aria-hidden
          />
        </button>
        {sectionOpen
          ? group.items.map((item) => {
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
            })
          : null}
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
          "flex size-10 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-sidebar-muted)] outline-none transition-colors hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
          open && "bg-[var(--color-sidebar-hover)] text-[var(--color-sidebar-text)]",
        )}
      >
        <GroupIcon className="size-[20px] shrink-0" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              role="region"
              aria-label={group.label}
              className="fixed z-[9999] min-w-[220px] rounded-[var(--radius-xl)] border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-elevated)] py-2 shadow-[var(--shadow-xl)]"
              style={{ top: flyoutPos.top, left: flyoutPos.left }}
              onMouseEnter={handleFlyoutEnter}
              onMouseLeave={handleFlyoutLeave}
            >
              <p className="border-b border-[var(--color-sidebar-border)] px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-sidebar-faint)]">
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
                          "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-active-text)]"
                            : "text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-text)]",
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

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === "admin";

  const visibleNavGroups = isAdmin
    ? navGroups
    : navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.adminOnly),
        }))
        .filter((group) => group.items.length > 0);

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return stored === "dark" || (stored !== "light" && prefersDark);
  });

  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch("/version.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { version?: unknown } | null) => {
        if (data && typeof data.version === "string" && data.version.trim()) {
          setAppVersion(data.version.trim());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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
          "fixed bottom-0 left-0 top-0 z-[100] flex flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] transition-[width] duration-200 ease-out",
          sidebarCollapsed ? "w-[60px]" : "w-[220px]",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-[var(--color-sidebar-border)]",
            sidebarCollapsed ? "justify-center px-0" : "px-4",
          )}
        >
          <NavLink
            to="/"
            end
            title="Ir para o início"
            className={cn(
              "font-bold tracking-tight text-[var(--color-sidebar-active-text)] outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded-[var(--radius-md)]",
              sidebarCollapsed ? "text-base" : "text-lg",
            )}
          >
            {sidebarCollapsed ? "CX" : "CRM-X"}
          </NavLink>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-2">
          {visibleNavGroups.map((group) => (
            <SidebarGroupBlock
              key={group.id}
              group={group}
              collapsed={sidebarCollapsed}
              containsActive={groupContainsPath(group, location.pathname)}
            />
          ))}
        </nav>
        {appVersion ? (
          <div
            className={cn(
              "shrink-0 border-t border-[var(--color-sidebar-border)] py-2.5",
              sidebarCollapsed ? "px-1 text-center" : "px-4",
            )}
          >
            <p
              className="truncate text-[11px] font-medium tabular-nums text-[var(--color-sidebar-faint)]"
              title={`Versão ${appVersion}`}
            >
              v{appVersion}
            </p>
          </div>
        ) : null}
      </aside>

      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        className={cn(
          "fixed top-14 z-[110] flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] shadow-[var(--shadow-sm)] outline-none transition-[left,colors] duration-200 ease-out hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
          sidebarCollapsed ? "left-[60px]" : "left-[220px]",
        )}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="size-3.5" aria-hidden />
        ) : (
          <ChevronLeft className="size-3.5" aria-hidden />
        )}
      </button>

      <div
        className={cn(
          "flex min-h-screen min-w-0 w-full flex-1 flex-col transition-[padding] duration-200 ease-out",
          sidebarCollapsed ? "pl-[60px]" : "pl-[220px]",
        )}
      >
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-4 backdrop-blur-md">
          <div className="min-w-0 max-w-md flex-1">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Tema claro" : "Tema escuro"}
              className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-muted)] outline-none transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
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
                  className="flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-sm font-semibold text-[var(--color-text)] outline-none transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                  aria-label="Menu do usuário"
                >
                  <span className="max-w-[8rem] truncate">{name}</span>
                </button>
              </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={8}
                align="end"
                className="z-[300] min-w-[200px] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-elevated)] p-1 shadow-[var(--shadow-lg)]"
              >
                <DropdownMenu.Label className="px-3 py-2 text-sm font-medium text-[var(--color-text)]">
                  {name}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-accent-soft)] data-[highlighted]:text-[var(--color-accent)]"
                  onSelect={() => navigate("/perfil")}
                >
                  <User className="size-4 text-[var(--color-muted)]" />
                  Perfil
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-danger-soft)] data-[highlighted]:text-[var(--color-danger)]"
                  onSelect={() => logout()}
                >
                  <LogOut className="size-4 text-[var(--color-muted)]" />
                  Sair
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
