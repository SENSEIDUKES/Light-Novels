import React, { ReactNode } from 'react';

export interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  id: string;
  label: ReactNode;
  value?: string;
  onChange: (value: string) => void;
  helpText?: ReactNode;
  rightElement?: ReactNode;
  children?: ReactNode; // For overlays
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  label,
  value,
  onChange,
  helpText,
  rightElement,
  children,
  className = '',
  maxLength,
  ...rest
}) => {
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <label
          className="block flex gap-2 items-center font-sc text-xs text-neutral-400 uppercase tracking-widest"
          htmlFor={id}
        >
          {label}
        </label>

        <div className="flex items-center gap-3">
          {maxLength !== undefined && (
             <span className="text-[10px] font-mono text-neutral-500">
               {(value || '').length} / {maxLength}
             </span>
          )}
          {rightElement && <span>{rightElement}</span>}
        </div>
      </div>

      {helpText && (
        <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
          {helpText}
        </p>
      )}

      <div className="relative">
        <textarea
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className={`w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none ${className}`}
          {...rest}
        />
        {children}
      </div>
    </div>
  );
};
