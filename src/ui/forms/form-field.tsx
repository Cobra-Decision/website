export interface FormFieldProps {
  label?: string | any;
  optionalLabel?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  id?: string;
  class?: string;
  children: any;
}

export function FormField({
  label,
  optionalLabel,
  required = false,
  hint,
  error,
  id,
  class: customClass = "",
  children,
}: FormFieldProps) {
  return (
    <div class={`form-control w-full space-y-1.5 ${customClass}`.trim()}>
      {label && (
        <div class="flex items-center justify-between px-0.5">
          <label class="label-text text-xs font-semibold text-base-content/90" for={id}>
            {label} {required && <span class="text-error font-bold">*</span>}
          </label>
          {!required && optionalLabel && (
            <span class="label-text-alt text-2xs text-base-content/50">{optionalLabel}</span>
          )}
        </div>
      )}
      {children}
      {hint && <p class="text-2xs text-base-content/60 px-0.5 text-start">{hint}</p>}
      {error && <p class="text-2xs text-error font-medium px-0.5 text-start">{error}</p>}
    </div>
  );
}
