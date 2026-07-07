import React from 'react';

interface FormFieldHeaderProps {
  id: string;
  label: string;
  description?: React.ReactNode;
  rightElement?: React.ReactNode;
  descriptionId?: string;
  labelClassName?: string;
}

export const FormFieldHeader: React.FC<FormFieldHeaderProps> = ({
  id,
  label,
  description,
  rightElement,
  descriptionId,
  labelClassName = ''
}) => {
  return (
    <>
      <div className="flex justify-between items-end mb-2">
        <label className={`block font-sc text-xs text-neutral-400 uppercase tracking-widest ${labelClassName}`} htmlFor={id}>
          {label}
        </label>
        {rightElement}
      </div>
      {description ? (
        <p id={descriptionId} className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
          {description}
        </p>
      ) : null}
    </>
  );
};
