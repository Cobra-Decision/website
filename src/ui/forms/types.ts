export type ComponentSize = "xs" | "sm" | "md" | "lg";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "ghost"
  | "outline"
  | "error"
  | "success"
  | "warning"
  | "info";

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "ghost"
  | "error"
  | "success"
  | "warning"
  | "info";

export interface SelectOption {
  value: string | number;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}
