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

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/contatos", label: "Contatos", icon: Users },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/negocios", label: "Negócios", icon: Briefcase },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/propostas", label: "Propostas", icon: FileText },
  { to: "/formularios", label: "Formulários", icon: ClipboardList },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
];

export function Sidebar() {
  const expanded = useChrome((s) => s.sidebarExpanded);
  const toggle = useChrome((s) => s.toggleSidebar);

  return (
    <aside
      className={`flex shrink-0 flex-col bg-shell text-slate-300 transition-[width] duration-200 ${
        expanded ? "w-[236px]" : "w-16"
      }`}
    >
      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) =>
              `group relative flex items-center rounded-md text-sm font-medium transition-colors ${
                expanded ? "gap-3 px-3 py-2" : "justify-center px-0 py-2"
              } ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <item.icon size={19} className="shrink-0" />
            {expanded ? (
              <span className="truncate">{item.label}</span>
            ) : (
              <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-shell-line p-2">
        <button
          onClick={toggle}
          title={expanded ? "Recolher menu" : "Expandir menu"}
          className={`flex w-full items-center rounded-md text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white ${
            expanded ? "gap-3 px-3 py-2" : "justify-center px-0 py-2"
          }`}
        >
          {expanded ? (
            <>
              <PanelLeftClose size={19} className="shrink-0" />
              <span className="truncate">Recolher</span>
            </>
          ) : (
            <PanelLeftOpen size={19} className="shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
