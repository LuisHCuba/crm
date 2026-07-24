import { Outlet } from "react-router-dom";
import { TopHeader } from "./chrome/TopHeader";
import { Sidebar, SidebarToggle } from "./chrome/Sidebar";

export function Layout() {
  return (
    <div className="relative flex h-screen flex-col bg-shell text-slate-800">
      <TopHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative z-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-tl-[var(--radius-notch)] bg-surface">
          <Outlet />
        </main>
      </div>
      {/* Fora da row com overflow-hidden — senão o -translate-y corta no header */}
      <SidebarToggle />
    </div>
  );
}
