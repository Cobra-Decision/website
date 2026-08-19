export const SOCIAL_LINKS = {
  email: "cobradecisionteam@gmail.com",
  telegram: "https://t.me/CobraDecision",
  github: "https://github.com/Cobra-Decision",
  linkedin: "https://www.linkedin.com/company/cobra-decision",
} as const;

export const SOCIAL_MEDIA_LIST = [
  { name: "Email", href: `mailto:${SOCIAL_LINKS.email}` },
  { name: "Telegram", href: SOCIAL_LINKS.telegram, target: "_blank", rel: "noopener noreferrer" },
  { name: "GitHub", href: SOCIAL_LINKS.github, target: "_blank", rel: "noopener noreferrer" },
  { name: "LinkedIn", href: SOCIAL_LINKS.linkedin, target: "_blank", rel: "noopener noreferrer" },
] as const;
