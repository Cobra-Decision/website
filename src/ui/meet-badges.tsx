import type { MeetStatus, MeetAccessStatus, MeetPublishStatus } from "../modules/events/types";
import type { Locale } from "../lib/i18n/translations";
import { t } from "../lib/i18n/context";
import { LockIcon } from "./icons";
import { Badge, type BadgeProps } from "./forms/badge";

export function getMeetStatusMeta(status: MeetStatus, locale: Locale = "en") {
  switch (status) {
    case "live":
      return {
        label: t("meet.status.live", locale),
        badgeClass: "badge-success text-white",
        pulse: true,
      };
    case "completed":
      return {
        label: t("meet.status.completed", locale),
        badgeClass: "badge-ghost",
        pulse: false,
      };
    default:
      return {
        label: t("meet.status.upcoming", locale),
        badgeClass: "badge-primary",
        pulse: false,
      };
  }
}

export interface MeetStatusBadgeProps extends BadgeProps {
  status?: MeetStatus;
  locale?: Locale;
}

export const MeetStatusBadge = ({
  status = "upcoming",
  locale = "en",
  size = "sm",
  class: extraClass = "",
  ...props
}: MeetStatusBadgeProps) => {
  const meta = getMeetStatusMeta(status, locale);
  const pulseClass = meta.pulse ? "animate-pulse" : "";
  const customClass = `${meta.badgeClass} ${pulseClass} ${extraClass}`.trim();

  return (
    <Badge size={size} class={customClass} {...props}>
      {meta.label}
    </Badge>
  );
};

export interface MeetAccessBadgeProps extends BadgeProps {
  accessStatus?: MeetAccessStatus;
  locale?: Locale;
}

export const MeetAccessBadge = ({
  accessStatus = "public",
  locale = "en",
  size = "sm",
  class: extraClass = "",
  ...props
}: MeetAccessBadgeProps) => {
  const isPublic = accessStatus === "public";
  const label = isPublic ? t("meet.public", locale) : t("meet.private", locale);
  const lockIcon = !isPublic ? (
    <LockIcon class={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
  ) : undefined;

  return (
    <Badge
      variant={isPublic ? undefined : "warning"}
      outline
      size={size}
      icon={lockIcon}
      class={`gap-1 ${extraClass}`.trim()}
      {...props}
    >
      {label}
    </Badge>
  );
};

export interface MeetPublishBadgeProps extends BadgeProps {
  publishStatus?: MeetPublishStatus;
  locale?: Locale;
}

export const MeetPublishBadge = ({
  publishStatus = "public",
  locale = "en",
  size = "sm",
  class: extraClass = "",
  ...props
}: MeetPublishBadgeProps) => {
  if (publishStatus === "public") return null;

  const isRestricted = publishStatus === "restricted";
  const label = isRestricted ? t("meet.restricted", locale) : t("meet.private", locale);
  const lockIcon = <LockIcon class={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />;

  return (
    <Badge
      variant={isRestricted ? "warning" : "neutral"}
      size={size}
      icon={lockIcon}
      class={`gap-1 ${extraClass}`.trim()}
      {...props}
    >
      {label}
    </Badge>
  );
};
