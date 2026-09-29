import type { ComponentSize } from "./types";

export interface InputProps {
  name?: string;
  type?: "text" | "email" | "password" | "number" | "search" | "url" | "tel" | "file" | "hidden" | string;
  size?: ComponentSize;
  variant?: "bordered" | "ghost" | "primary" | "error" | "success";
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  id?: string;
  class?: string;
  [key: string]: any;
}

const inputSizes: Record<ComponentSize, string> = {
  xs: "input-xs",
  sm: "input-sm",
  md: "input-md",
  lg: "input-lg",
};

const fileInputSizes: Record<ComponentSize, string> = {
  xs: "file-input-xs",
  sm: "file-input-sm",
  md: "file-input-md",
  lg: "file-input-lg",
};

export function Input({
  name,
  type = "text",
  size,
  variant = "bordered",
  value,
  placeholder,
  required,
  disabled,
  readonly,
  autocomplete,
  id,
  class: customClass = "",
  ...props
}: InputProps) {
  if (type === "hidden") {
    return <input type="hidden" name={name} value={value} id={id} class={customClass || undefined} {...props} />;
  }

  const isFile = type === "file";
  const baseClass = isFile ? "file-input" : "input";
  const sizeClass = size ? (isFile ? fileInputSizes[size] : inputSizes[size]) : "";
  const isGhost = variant === "ghost";
  const borderClass = isGhost ? `${baseClass}-ghost` : `${baseClass}-bordered`;
  const colorClass = variant && variant !== "bordered" && !isGhost ? `${baseClass}-${variant}` : "";
  const focusClass = isFile ? "focus:file-input-primary" : "focus:input-primary focus:outline-none";

  const classes = [baseClass, borderClass, colorClass, sizeClass, focusClass, "w-full", customClass]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      type={type}
      name={name}
      value={value}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readonly={readonly}
      autocomplete={autocomplete}
      id={id}
      class={classes}
      {...props}
    />
  );
}
