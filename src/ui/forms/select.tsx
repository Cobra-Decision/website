import type { ComponentSize, SelectOption } from "./types";

export interface SelectProps {
  name?: string;
  size?: ComponentSize;
  options?: SelectOption[];
  placeholder?: string;
  value?: string | number;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  class?: string;
  children?: any;
  [key: string]: any;
}

const selectSizes: Record<ComponentSize, string> = {
  xs: "select-xs",
  sm: "select-sm",
  md: "select-md",
  lg: "select-lg",
};

export function Select({
  name,
  size,
  options,
  placeholder,
  value,
  required,
  disabled,
  id,
  class: customClass = "",
  children,
  ...props
}: SelectProps) {
  const sizeClass = size ? selectSizes[size] : "";
  const classes = ["select select-bordered", sizeClass, "focus:select-primary focus:outline-none w-full", customClass]
    .filter(Boolean)
    .join(" ");

  const isPlaceholderSelected = value === undefined || value === null || value === "";

  return (
    <select name={name} required={required} disabled={disabled} id={id} class={classes} {...props}>
      {placeholder && (
        <option value="" disabled selected={isPlaceholderSelected}>
          {placeholder}
        </option>
      )}
      {options
        ? options.map((opt) => {
            const isSelected =
              value !== undefined && value !== null
                ? String(opt.value) === String(value)
                : Boolean(opt.selected);

            return (
              <option
                key={String(opt.value)}
                value={opt.value}
                selected={isSelected}
                disabled={opt.disabled}
              >
                {opt.label}
              </option>
            );
          })
        : children}
    </select>
  );
}
