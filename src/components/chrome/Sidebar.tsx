import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Package,
  FileText,
  ClipboardList,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useChrome } from "./uiStore";
import {
  SHELL_HEADER_TOP_CLASS,
  shellSidebarToggleLeft,
  shellSidebarWidthClass,
} from "./shellLayout";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  /** Rótulo da seção (null = itens soltos no topo, ex.: Dashboard). */
  title: string | null;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: null,
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    title: "CRM",
    items: [
      { to: "/contatos", label: "Contatos", icon: Users },
      { to: "/empresas", label: "Empresas", icon: Building2 },
    ],
  },
  {
    title: "Vendas",
    items: [
      { to: "/negocios", label: "Negócios", icon: Briefcase },
      { to: "/propostas", label: "Propostas", icon: FileText },
      { to: "/produtos", label: "Produtos", icon: Package },
    ],
  },
  {
    title: "Marketing",
    items: [
      { to: "/formularios", label: "Formulários", icon: ClipboardList },
    ],
  },
  {
    title: "Financeiro",
    items: [{ to: "/financeiro", label: "Financeiro", icon: Wallet }],
  },
];

export function Sidebar() {
  const expanded = useChrome((s) => s.sidebarExpanded);

  return (
    <aside
      className={`flex shrink-0 flex-col overflow-x-hidden border-r border-shell-line bg-shell text-slate-300 transition-[width] duration-200 ${shellSidebarWidthClass(expanded)}`}
    >
      <nav
        aria-label="Navegação principal"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2 pt-4"
      >
        {navSections.map((section, si) => (
          <div key={section.title ?? `top-${si}`} className="mb-1.5">
            {section.title &&
              (expanded ? (
                <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {section.title}
                </p>
              ) : (
                si > 0 && (
                  <div
                    className="mx-auto my-2 w-8 border-t border-shell-line"
                    aria-hidden
                  />
                )
              ))}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={!expanded ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-md text-sm font-medium transition-colors ${
                      expanded ? "gap-3 px-3 py-2" : "justify-center p-2"
                    } ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <item.icon size={19} className="shrink-0" />
                  {expanded && (
                    <span className="min-w-0 truncate">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Botão no cruzamento header × sidebar — fora do aside para não ser clipado. */
export function SidebarToggle() {
  const expanded = useChrome((s) => s.sidebarExpanded);
  const toggle = useChrome((s) => s.toggleSidebar);

  return (
    <button
      type="button"
      onClick={toggle}
      title={expanded ? "Recolher menu" : "Expandir menu"}
      aria-label={expanded ? "Recolher menu" : "Expandir menu"}
      aria-expanded={expanded}
      className={`pointer-events-auto fixed z-[200] flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-shell-line bg-shell text-slate-400 transition-[left,colors,background-color] duration-200 hover:border-shell-active hover:bg-shell-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-shell ${shellSidebarToggleLeft(expanded)} ${SHELL_HEADER_TOP_CLASS}`}
    >
      {expanded ? (
        <PanelLeftClose size={12} strokeWidth={2.25} />
      ) : (
        <PanelLeftOpen size={12} strokeWidth={2.25} />
      )}
    </button>
  );
}
