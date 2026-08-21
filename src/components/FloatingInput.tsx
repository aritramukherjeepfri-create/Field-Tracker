import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './Icon';

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  trailing?: ReactNode;
}

export function FloatingInput({ label, trailing, className = '', id, ...rest }: FloatingInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="relative">
      <input
        id={inputId}
        placeholder=" "
        className={`peer w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md pt-lg pb-sm text-body-lg text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary ${trailing ? 'pr-2xl' : ''} ${className}`}
        {...rest}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-md top-sm text-label-caps label-caps text-on-surface-variant transition-all
          peer-placeholder-shown:top-lg peer-placeholder-shown:text-body-lg peer-placeholder-shown:text-outline peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-normal
          peer-focus:top-sm peer-focus:text-label-caps peer-focus:label-caps peer-focus:text-primary"
      >
        {label}
      </label>
      {trailing && (
        <div className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
          {trailing}
        </div>
      )}
    </div>
  );
}

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function FloatingTextarea({ label, className = '', id, ...rest }: FloatingTextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="relative">
      <textarea
        id={inputId}
        placeholder=" "
        className={`peer w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md pt-lg pb-sm text-body-lg text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none ${className}`}
        {...rest}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-md top-sm text-label-caps label-caps text-on-surface-variant transition-all
          peer-placeholder-shown:top-lg peer-placeholder-shown:text-body-lg peer-placeholder-shown:text-outline peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-normal
          peer-focus:top-sm peer-focus:text-label-caps peer-focus:label-caps peer-focus:text-primary"
      >
        {label}
      </label>
    </div>
  );
}

interface FloatingSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function FloatingSelect({ label, className = '', id, children, ...rest }: FloatingSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="relative">
      <select
        id={inputId}
        className={`peer w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md pt-lg pb-sm pr-2xl text-body-lg text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none ${className}`}
        {...rest}
      >
        {children}
      </select>
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-md top-sm text-label-caps label-caps text-on-surface-variant"
      >
        {label}
      </label>
      <div className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
        <Icon name="expand_circle_down" size={18} />
      </div>
    </div>
  );
}
