import type { ButtonVariant, ComponentSize } from "./types";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  type?: "button" | "submit" | "reset";
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  htmxIndicator?: boolean;
  outline?: boolean;
  circle?: boolean;
  square?: boolean;
  block?: boolean;
  icon?: any;
  iconRight?: any;
  class?: string;
  children?: any;
  [key: string]: any;
}

const sizeClasses: Record<ComponentSize, string> = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  neutral: "btn-neutral",
  ghost: "btn-ghost",
  outline: "btn-outline",
  error: "btn-error",
  success: "btn-success",
  warning: "btn-warning",
  info: "btn-info",
};

export function Button({
  variant,
  size,
  type = "button",
  href,
  disabled = false,
  loading = false,
  htmxIndicator = false,
  outline = false,
  circle = false,
  square = false,
  block = false,
  icon,
  iconRight,
  class: customClass = "",
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "btn",
    variant ? variantClasses[variant] : "",
    size ? sizeClasses[size] : "",
    outline ? "btn-outline" : "",
    circle ? "btn-circle" : "",
    square ? "btn-square" : "",
    block ? "btn-block" : "",
    customClass,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading && <span class="loading loading-spinner loading-xs me-2" aria-hidden="true"></span>}
      {htmxIndicator && <span class="htmx-indicator loading loading-spinner loading-xs me-2" aria-hidden="true"></span>}
      {!loading && icon && <span class="inline-flex shrink-0 me-2 items-center">{icon}</span>}
      {children}
      {iconRight && <span class="inline-flex shrink-0 ms-2 items-center">{iconRight}</span>}
    </>
  );

  if (href) {
    if (disabled) {
      return (
        <a class={`${classes} pointer-events-none opacity-50`} aria-disabled="true" role="link" {...props}>
          {content}
        </a>
      );
    }
    return (
      <a href={href} class={classes} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} class={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
