import React, { ReactNode } from 'react';

export interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  id: string;
  label: ReactNode;
  value?: string | number;
  onChange: (value: string) => void;
  helpText?: ReactNode;
  rightElement?: ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  value,
  onChange,
  helpText,
  rightElement,
  className = '',
  type = 'text',
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
        {rightElement && <span>{rightElement}</span>}
      </div>

      {helpText && (
        <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
          {helpText}
        </p>
      )}

      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-2 text-sm ${className}`}
        {...rest}
      />
    </div>
  );
};
