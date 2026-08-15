export type TagBadgeProps = {
  title: string;
  description?: string | null;
  size?: "xs" | "sm" | "md";
  variant?: "outline" | "ghost" | "primary" | "secondary" | "neutral";
  onRemoveHref?: string;
  removeTarget?: string;
  removeAriaLabel?: string;
};

export const TagBadge = ({
  title,
  description,
  size = "sm",
  variant = "outline",
  onRemoveHref,
  removeTarget,
  removeAriaLabel,
}: TagBadgeProps) => {
  const sizeClass = size === "xs" ? "badge-sm text-[11px] px-2 py-0.5" : size === "md" ? "badge-md px-3 py-1" : "badge-sm px-2.5 py-0.5";
  const variantClass = variant === "outline" ? "badge-outline" : `badge-${variant}`;
  const badgeClasses = `badge ${variantClass} ${sizeClass} inline-flex items-center gap-1 shrink-0 font-medium`;

  if (onRemoveHref) {
    const badgeContent = (
      <span class={badgeClasses}>
        <span>{title}</span>
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
      </span>
    );

    if (description) {
      return (
        <span class="tooltip" data-tip={description}>
          {badgeContent}
        </span>
      );
    }

    return badgeContent;
  }

  if (description) {
    return (
      <span class="tooltip" data-tip={description}>
        <span class={badgeClasses}>{title}</span>
      </span>
    );
  }

  return <span class={badgeClasses}>{title}</span>;
};
