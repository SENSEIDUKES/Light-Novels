import React from 'react';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  description?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  value,
  onChange,
  description,
  rightElement,
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      <div className="flex justify-between items-end mb-2">
        <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest" htmlFor={id}>
          {label}
        </label>
        {rightElement}
      </div>
      {description && (
        <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
          {description}
        </p>
      )}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  );
};
