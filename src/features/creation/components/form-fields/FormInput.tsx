import React from 'react';
import { FormFieldHeader } from './FormFieldHeader';

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
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <FormFieldHeader
        id={id}
        label={label}
        description={description}
        descriptionId={descriptionId}
        rightElement={rightElement}
      />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  );
};
