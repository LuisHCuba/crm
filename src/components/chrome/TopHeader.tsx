import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, UserRound, UserCog, LogOut } from "lucide-react";
import { useAuth } from "../../store/auth";
import { useChrome } from "./uiStore";
import { GlobalSearch } from "./GlobalSearch";
import {
  SHELL_HEADER_HEIGHT_CLASS,
  shellHeaderBrandWidthClass,
} from "./shellLayout";

export function TopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarExpanded = useChrome((s) => s.sidebarExpanded);
  const isAdmin = user?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className={`relative z-10 flex ${SHELL_HEADER_HEIGHT_CLASS} shrink-0 items-center overflow-visible border-b border-shell-line bg-shell pr-3 text-slate-200`}>
      <button
        type="button"
        onClick={() => navigate("/")}
        title="Página inicial"
        className={`flex h-full shrink-0 items-center transition-colors hover:bg-white/5 ${shellHeaderBrandWidthClass(sidebarExpanded)}`}
      >
        <img
          src="/omnia.png"
          alt="Omn.ia"
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
        {sidebarExpanded && (
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-white">
              Omn.ia
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              by LHCX
            </span>
          </span>
        )}
      </button>

      <div className="w-full max-w-2xl">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md p-0.5 pr-1.5 transition-colors hover:bg-white/10"
          >
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xs font-semibold text-white">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.name ?? "Usuário"}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-100 md:inline">
              {user?.name ?? "Usuário"}
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-[dropdown-in_.12s_ease-out]">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.name ?? "Usuário"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user?.email}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/perfil");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <UserRound size={16} />
                  Perfil
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/usuarios");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <UserCog size={16} />
                    Usuários
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
