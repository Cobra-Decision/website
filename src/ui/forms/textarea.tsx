import type { ComponentSize } from "./types";

export interface TextareaProps {
  name?: string;
  rows?: number;
  size?: ComponentSize;
  variant?: "bordered" | "ghost" | "primary" | "error" | "success";
  value?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  id?: string;
  class?: string;
  children?: any;
  [key: string]: any;
}

const textareaSizes: Record<ComponentSize, string> = {
  xs: "textarea-xs",
  sm: "textarea-sm",
  md: "textarea-md",
  lg: "textarea-lg",
};

export function Textarea({
  name,
  rows,
  size,
  variant = "bordered",
  value,
  placeholder,
  required,
  disabled,
  readonly,
  id,
  class: customClass = "",
  children,
  ...props
}: TextareaProps) {
  const sizeClass = size ? textareaSizes[size] : "";
  const isGhost = variant === "ghost";
  const borderClass = isGhost ? "textarea-ghost" : "textarea-bordered";
  const colorClass = variant && variant !== "bordered" && !isGhost ? `textarea-${variant}` : "";

  const classes = [
    "textarea",
    borderClass,
    colorClass,
    sizeClass,
    "focus:textarea-primary focus:outline-none w-full",
    customClass,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <textarea
      name={name}
      rows={rows}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readonly={readonly}
      id={id}
      class={classes}
      {...props}
    >
      {value ?? children ?? ""}
    </textarea>
  );
}
