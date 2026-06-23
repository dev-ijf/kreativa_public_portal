"use client";

import type { ReactNode } from "react";

/** Small uppercase label above a field value. */
export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  const className = "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block";
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={className}>
        {children}
      </label>
    );
  }
  return <p className={className}>{children}</p>;
}

/** Secondary hint or question text within a section body. */
export function FieldCaption({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-normal text-slate-500 leading-relaxed ${className}`.trim()}>{children}</p>
  );
}

/** Primary read-only value — short text. */
export function FieldValue({ children }: { children: ReactNode }) {
  return <p className="text-[15px] font-semibold text-slate-900 leading-snug">{children}</p>;
}

/** Primary read-only value — paragraph / multiline. */
export function FieldValueBlock({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] font-normal text-slate-800 leading-relaxed whitespace-pre-wrap">{children}</p>
  );
}

type Props = {
  title: string;
  icon?: string;
  subtitle?: string;
  headerClassName: string;
  children: ReactNode;
};

export function ReportSectionShell({
  title,
  icon,
  subtitle,
  headerClassName,
  children,
}: Props) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`px-4 py-3 text-white ${headerClassName}`}>
        <h3 className="font-bold text-sm flex items-center gap-2">
          {icon ? <span aria-hidden>{icon}</span> : null}
          {title}
        </h3>
        {subtitle ? <p className="text-[11px] text-white/80 mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

export function StarRating({ rating, max = 3 }: { rating: number | null; max?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating ?? 0} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < (rating ?? 0) ? "text-amber-400" : "text-slate-200"}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function ReadOnlyPills({
  options,
  selected,
  label,
}: {
  options: { value: string; label: string }[];
  selected: string | null;
  label?: string;
}) {
  return (
    <div>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <span
            key={opt.value}
            className={[
              "px-3 py-1.5 rounded-full text-sm border",
              selected === opt.value
                ? "font-semibold bg-primary text-white border-primary"
                : "font-normal bg-white text-slate-400 border-slate-200",
            ].join(" ")}
          >
            {opt.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ReadOnlyMultiPills({
  options,
  label,
}: {
  options: { label: string; selected: boolean }[];
  label?: string;
}) {
  return (
    <div>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <span
            key={opt.label}
            className={[
              "px-3 py-1.5 rounded-full text-sm border",
              opt.selected
                ? "font-semibold bg-primary/10 text-primary border-primary/40"
                : "font-normal bg-white text-slate-400 border-slate-200",
            ].join(" ")}
          >
            {opt.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ReadOnlyLearningAreaList({
  items,
  displayName,
}: {
  items: { name: string; nameId: string | null; selected: boolean; rating: number | null }[];
  displayName: (name: string, nameId: string | null) => string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((la) => (
        <li
          key={la.name}
          className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={[
                "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 text-[10px] font-bold",
                la.selected
                  ? "bg-primary border-primary text-white"
                  : "bg-white border-slate-200 text-transparent",
              ].join(" ")}
              aria-hidden
            >
              ✓
            </span>
            <span
              className={[
                "text-[15px] truncate",
                la.selected ? "font-semibold text-slate-900" : "font-normal text-slate-400",
              ].join(" ")}
            >
              {displayName(la.name, la.nameId)}
            </span>
          </div>
          <StarRating rating={la.selected ? la.rating : null} />
        </li>
      ))}
    </ul>
  );
}

export function ReadOnlyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? <FieldValueBlock>{value}</FieldValueBlock> : <FieldValue>{value}</FieldValue>}
    </div>
  );
}
