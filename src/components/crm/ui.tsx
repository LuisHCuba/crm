import { type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { initials } from "./labels";

/* ------------------------------------------------------------------ */
/*  Estados                                                            */
/* ------------------------------------------------------------------ */

export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <Loader2 className="animate-spin" size={18} /> {label}
    </div>
  );
}

export function ErrorState({ label = "Erro ao carregar." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      {label}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge / Avatar                                                     */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        className || "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  url,
  size = 32,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 font-semibold text-indigo-700"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name || undefined}
    >
      {url ? (
        <img src={url} alt={name || ""} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const max =
    size === "xl" ? "max-w-3xl" : size === "lg" ? "max-w-xl" : "max-w-md";
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${max} rounded-2xl bg-white p-6 shadow-xl`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Campos de formulário                                               */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function Label({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

export function TextField({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  placeholder,
  step,
  min,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        step={step}
        min={min}
        className={inputClass}
      />
    </div>
  );
}

export function TextArea({
  name,
  label,
  required,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        rows={rows}
        className={inputClass}
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  required,
  defaultValue,
  options,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={inputClass}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SubmitButton({
  loading,
  children = "Salvar",
}: {
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export const fieldInputClass = inputClass;
