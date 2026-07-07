import React from 'react';
import { FormFieldHeader } from './FormFieldHeader';

interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: React.ReactNode;
  rightElement?: React.ReactNode;
  maxLength?: number;
  textareaClassName?: string;
  children?: React.ReactNode;
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
  textareaClassName = '',
  children,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ') || undefined;
  const headerRightElement = (
    <div className="flex items-center gap-3">
      {maxLength ? (
        <span className="text-[10px] font-mono text-neutral-500">
          {(value || '').length} / {maxLength}
        </span>
      ) : null}
      {rightElement}
    </div>
  );

  return (
    <div className={className}>
      <FormFieldHeader
        id={id}
        label={label}
        description={description}
        descriptionId={descriptionId}
        rightElement={headerRightElement}
        labelClassName="flex gap-2 items-center"
      />
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          aria-describedby={describedBy}
          className={`w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed ${textareaClassName}`}
          {...props}
        />
        {children}
      </div>
    </div>
  );
};
