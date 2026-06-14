import type { CSSProperties } from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

const tokenStyle = {
  "--normal-bg": "var(--color-elevated)",
  "--normal-text": "var(--color-text)",
  "--normal-border": "var(--color-border)",
  "--border-radius": "var(--radius-lg)",
} as CSSProperties;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      richColors
      closeButton
      position="bottom-right"
      style={tokenStyle}
      toastOptions={{
        style: { boxShadow: "var(--shadow-lg)" },
      }}
      {...props}
    />
  );
}
