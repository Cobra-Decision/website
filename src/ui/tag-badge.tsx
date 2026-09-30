import { Badge, type BadgeProps } from "./forms/badge";

export interface TagBadgeProps extends Omit<BadgeProps, "variant"> {
  title: string;
  description?: string | null;
  size?: "xs" | "sm" | "md";
  variant?: "outline" | "ghost" | "primary" | "secondary" | "neutral";
  onRemoveHref?: string;
  removeTarget?: string;
  removeAriaLabel?: string;
  class?: string;
}

export const TagBadge = ({
  title,
  description,
  size = "sm",
  variant = "outline",
  onRemoveHref,
  removeTarget,
  removeAriaLabel,
  class: customClass = "",
  ...props
}: TagBadgeProps) => {
  const isOutline = variant === "outline";
  const badgeElement = (
    <Badge
      variant={isOutline ? undefined : variant}
      outline={isOutline}
      size={size}
      class={`inline-flex items-center gap-1 shrink-0 font-medium ${customClass}`.trim()}
      {...props}
    >
      {onRemoveHref ? <span>{title}</span> : title}
      {onRemoveHref && (
        <button
          type="button"
          class="ms-0.5 inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
          aria-label={removeAriaLabel ?? `Remove ${title}`}
          hx-delete={onRemoveHref}
          hx-target={removeTarget}
          hx-swap="outerHTML"
        >
          ×
        </button>
      )}
    </Badge>
  );

  if (description) {
    return (
      <span class="tooltip" data-tip={description}>
        {badgeElement}
      </span>
    );
  }

  return badgeElement;
};
