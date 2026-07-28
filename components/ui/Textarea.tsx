'use client';

import { forwardRef, useId } from 'react';
import { TEXTAREA_NOTE_MAX } from '@/lib/portal/textarea-limits';

export { TEXTAREA_NOTE_MAX };

export type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'maxLength'
> & {
  /** Character limit shown as `current/max`. Defaults to 1000. */
  maxLength?: number;
  /** Show bottom-right `current/max` counter. Defaults to true. */
  showCount?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      maxLength = TEXTAREA_NOTE_MAX,
      showCount = true,
      className = '',
      value,
      defaultValue,
      onChange,
      id,
      disabled,
      ...props
    },
    ref,
  ) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const resolved =
      value !== undefined
        ? String(value ?? '')
        : defaultValue !== undefined
          ? String(defaultValue ?? '')
          : '';
    const count = resolved.length;
    const atLimit = count >= maxLength;

    return (
      <div className="relative">
        <textarea
          ref={ref}
          id={fieldId}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          maxLength={maxLength}
          onChange={onChange}
          className={[
            'w-full resize-y pb-7',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {showCount ? (
          <span
            className={[
              'pointer-events-none absolute bottom-2.5 right-3 text-[11px] tabular-nums leading-none',
              atLimit ? 'text-rose-500 font-medium' : 'text-slate-400',
              disabled ? 'opacity-50' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-live="polite"
          >
            {count}/{maxLength}
          </span>
        ) : null}
      </div>
    );
  },
);
