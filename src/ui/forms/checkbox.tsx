import type { ComponentSize } from "./types";

export interface CheckboxProps {
  name?: string;
  value?: string | number;
  checked?: boolean;
  size?: ComponentSize;
  variant?: "primary" | "secondary" | "accent" | "success" | "error" | "warning" | "info";
  label?: string;
  disabled?: boolean;
  id?: string;
  class?: string;
  [key: string]: any;
}

const checkboxSizes: Record<ComponentSize, string> = {
  xs: "checkbox-xs",
  sm: "checkbox-sm",
  md: "checkbox-md",
  lg: "checkbox-lg",
};

export function Checkbox({
  name,
  value,
  checked,
  size,
  variant = "primary",
  label,
  disabled,
  id,
  class: customClass = "",
  ...props
}: CheckboxProps) {
  const sizeClass = size ? checkboxSizes[size] : "";
  const variantClass = variant ? `checkbox-${variant}` : "checkbox-primary";
  const inputClass = ["checkbox", variantClass, sizeClass, !label ? customClass : ""].filter(Boolean).join(" ");

  const inputEl = (
    <input
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      id={id}
      class={inputClass}
      {...props}
    />
  );

  if (!label) {
    return inputEl;
  }

  return (
    <label class={`label cursor-pointer justify-start gap-2 ${customClass}`.trim()}>
      {inputEl}
      <span class="label-text">{label}</span>
    </label>
  );
}
