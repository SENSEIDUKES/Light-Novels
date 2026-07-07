import React from 'react';

interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: React.ReactNode;
  rightElement?: React.ReactNode;
  maxLength?: number;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  label,
  value,
  onChange,
  description,
  rightElement,
  maxLength,
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      <div className="flex justify-between items-end mb-2">
        <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest flex gap-2 items-center" htmlFor={id}>
          {label}
        </label>
        <div className="flex items-center gap-3">
          {maxLength && (
            <span className="text-[10px] font-mono text-neutral-500">
              {(value || '').length} / {maxLength}
            </span>
          )}
          {rightElement}
        </div>
      </div>
      {description && (
        <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
          {description}
        </p>
      )}
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          {...props}
        />
      </div>
    </div>
  );
};
