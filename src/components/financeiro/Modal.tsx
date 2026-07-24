import { useEffect } from "react";
import { X } from "lucide-react";
import { ModalOverlay } from "../chrome/OverlayPortal";
import { OVERLAY_PANEL_MAX_H_CLASS } from "../chrome/overlays";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  // Esc fecha; enquanto aberto, trava o scroll da página atrás.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <ModalOverlay backdropClassName="bg-slate-900/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto flex w-full ${width} ${OVERLAY_PANEL_MAX_H_CLASS} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modal-in_.18s_ease-out]`}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
