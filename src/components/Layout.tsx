import { Outlet } from "react-router-dom";
import { TopHeader } from "./chrome/TopHeader";
import { Sidebar } from "./chrome/Sidebar";

export function Layout() {
  return (
    <div className="flex h-screen flex-col bg-shell text-slate-800">
      <TopHeader />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto rounded-tl-[var(--radius-notch)] bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
