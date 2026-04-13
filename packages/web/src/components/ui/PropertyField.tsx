import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

type PropertyFieldProps = {
  label: string;
  value?: string | null;
  href?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PropertyField({
  label,
  value,
  href,
  children,
  className,
}: PropertyFieldProps) {
  const display = children ?? value ?? "—";

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      {href && value ? (
        <Link
          to={href}
          className="truncate text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          {value}
        </Link>
      ) : (
        <span className="truncate text-sm text-[var(--color-text)]">
          {display}
        </span>
      )}
    </div>
  );
}
