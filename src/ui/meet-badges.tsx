import type { MeetStatus, MeetAccessStatus } from "../modules/events/types";
import type { Locale } from "../lib/i18n/translations";
import { t } from "../lib/i18n/context";
import { LockIcon } from "./icons";

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

export const MeetStatusBadge = ({
  status = "upcoming",
  locale = "en",
  size = "sm",
  class: extraClass = "",
}: {
  status?: MeetStatus;
  locale?: Locale;
  size?: "xs" | "sm" | "md";
  class?: string;
}) => {
  const meta = getMeetStatusMeta(status, locale);
  const sizeClass = size === "xs" ? "badge-xs" : size === "sm" ? "badge-sm" : "";
  const pulseClass = meta.pulse ? "animate-pulse" : "";

  return (
    <span class={`badge ${meta.badgeClass} ${sizeClass} ${pulseClass} ${extraClass}`.trim()}>
      {meta.label}
    </span>
  );
};

export const MeetAccessBadge = ({
  accessStatus = "public",
  locale = "en",
  size = "sm",
  class: extraClass = "",
}: {
  accessStatus?: MeetAccessStatus;
  locale?: Locale;
  size?: "xs" | "sm" | "md";
  class?: string;
}) => {
  const isPublic = accessStatus === "public";
  const label = isPublic ? t("meet.public", locale) : t("meet.private", locale);
  const badgeClass = isPublic ? "badge-outline" : "badge-warning badge-outline";
  const sizeClass = size === "xs" ? "badge-xs" : size === "sm" ? "badge-sm" : "";

  return (
    <span class={`badge ${badgeClass} ${sizeClass} gap-1 ${extraClass}`.trim()}>
      {!isPublic && <LockIcon class={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      {label}
    </span>
  );
};
