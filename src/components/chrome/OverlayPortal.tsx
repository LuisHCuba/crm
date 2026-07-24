import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import {
  OVERLAY_SAFE_PADDING_CLASS,
  OVERLAY_Z_CLASS,
} from "./overlays";

export function OverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** Backdrop fullscreen portado no body — não sofre clip do shell/main. */
export function ModalOverlay({
  children,
  backdropClassName = "bg-black/40",
  onBackdropMouseDown,
}: {
  children: ReactNode;
  backdropClassName?: string;
  onBackdropMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <OverlayPortal>
      <div
        className={`fixed inset-0 ${OVERLAY_Z_CLASS} overflow-y-auto overscroll-contain ${OVERLAY_SAFE_PADDING_CLASS} animate-[fade-in_.15s_ease-out] ${backdropClassName}`}
        onMouseDown={onBackdropMouseDown}
      >
        <div className="flex min-h-full items-center justify-center">
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
}
