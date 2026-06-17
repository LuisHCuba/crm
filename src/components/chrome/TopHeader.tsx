import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  UserRound,
  UserCog,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../store/auth";
import { useChrome } from "./uiStore";

export function TopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarExpanded = useChrome((s) => s.sidebarExpanded);
  const isAdmin = user?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="flex h-11 shrink-0 items-center bg-shell pr-3 text-slate-200">
      <button
        type="button"
        onClick={() => navigate("/")}
        title="Página inicial"
        className={`flex h-full shrink-0 items-center transition-colors hover:bg-white/5 ${
          sidebarExpanded ? "w-[236px] gap-3 pl-5" : "w-16 justify-center"
        }`}
      >
        <img
          src="/omnia.png"
          alt="Omn.ia"
          className="h-9 w-9 shrink-0 rounded-md object-cover"
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
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Encontrar ou perguntar"
            className="h-7 w-full rounded-md border border-white/10 bg-white/10 pl-8 pr-16 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/30"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 sm:flex">
            Ctrl K
          </kbd>
        </div>
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
            <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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
