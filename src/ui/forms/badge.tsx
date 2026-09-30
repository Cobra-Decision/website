import type { BadgeVariant, ComponentSize } from "./types";

export interface BadgeProps {
  as?: "span" | "div" | "button" | "label" | "a";
  variant?: BadgeVariant;
  size?: ComponentSize;
  outline?: boolean;
  icon?: any;
  iconRight?: any;
  class?: string;
  children?: any;
  [key: string]: any; // Full HTMX, Alpine, and HTML attribute forwarding
}

const sizeClasses: Record<ComponentSize, string> = {
  xs: "badge-xs",
  sm: "badge-sm",
  md: "badge-md",
  lg: "badge-lg",
};

const variantClasses: Record<BadgeVariant, string> = {
  primary: "badge-primary",
  secondary: "badge-secondary",
  accent: "badge-accent",
  neutral: "badge-neutral",
  ghost: "badge-ghost",
  error: "badge-error",
  success: "badge-success",
  warning: "badge-warning",
  info: "badge-info",
};

export function Badge({
  as: Tag = "span",
  variant,
  size,
  outline = false,
  icon,
  iconRight,
  class: customClass = "",
  children,
  ...props
}: BadgeProps) {
  const classes = [
    "badge",
    variant ? variantClasses[variant] : "",
    size ? sizeClasses[size] : "",
    outline ? "badge-outline" : "",
    customClass,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && <span class="inline-flex shrink-0 me-1 items-center">{icon}</span>}
      {children}
      {iconRight && <span class="inline-flex shrink-0 ms-1 items-center">{iconRight}</span>}
    </>
  );

  return (
    <Tag class={classes} {...props}>
      {content}
    </Tag>
  );
}
