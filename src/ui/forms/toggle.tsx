import type { ComponentSize } from "./types";

export interface ToggleProps {
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

const toggleSizes: Record<ComponentSize, string> = {
  xs: "toggle-xs",
  sm: "toggle-sm",
  md: "toggle-md",
  lg: "toggle-lg",
};

export function Toggle({
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
}: ToggleProps) {
  const sizeClass = size ? toggleSizes[size] : "";
  const variantClass = variant ? `toggle-${variant}` : "toggle-primary";
  const inputClass = ["toggle", variantClass, sizeClass, !label ? customClass : ""].filter(Boolean).join(" ");

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
