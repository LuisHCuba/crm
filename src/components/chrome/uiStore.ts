import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChromeState {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (value: boolean) => void;
}

export const useChrome = create<ChromeState>()(
  persist(
    (set) => ({
      sidebarExpanded: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (value) => set({ sidebarExpanded: value }),
    }),
    { name: "crm-lhcx-chrome" }
  )
);
