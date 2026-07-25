'use client';

type Props = {
  open: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmDanger = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4 bg-black/45"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-black text-slate-800">
          {title}
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            className="flex-1 py-3 rounded-2xl font-bold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={[
              'flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-colors',
              confirmDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90',
            ].join(' ')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
