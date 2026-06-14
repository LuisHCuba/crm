import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(8,11,18,0.55)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-[var(--shadow-xl)] outline-none",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
            <Dialog.Title className="text-lg font-semibold text-[var(--color-text)]">
              {title}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {title}
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-9 p-0"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-4">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
