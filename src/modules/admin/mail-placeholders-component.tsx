export interface PlaceholderDef {
  tag: string;
  label: string;
  description?: string;
}

export const COMMON_EMAIL_PLACEHOLDERS: PlaceholderDef[] = [
  { tag: "{{name}}", label: "+ name" },
  { tag: "{{email}}", label: "+ email" },
  { tag: "{{first_name}}", label: "+ first_name" },
  { tag: "{{last_name}}", label: "+ last_name" },
  { tag: "{{username}}", label: "+ username" },
  { tag: "{{date}}", label: "+ date" },
  { tag: "{{date_shamsi}}", label: "+ date_shamsi" },
  { tag: "{{dashboard_url}}", label: "+ dashboard_url" },
  { tag: "{{meet_title}}", label: "+ meet_title" },
  { tag: "{{meet_date}}", label: "+ meet_date" },
  { tag: "{{meet_date_shamsi}}", label: "+ meet_date_shamsi" },
  { tag: "{{meet_time}}", label: "+ meet_time" },
  { tag: "{{meet_duration}}", label: "+ meet_duration" },
  { tag: "{{presenter_name}}", label: "+ presenter_name" },
  { tag: "{{meet_link}}", label: "+ meet_link" },
  { tag: "{{tags}}", label: "+ tags" },
  { tag: "{{otp}}", label: "+ otp" },
  { tag: "{{unsubscribe_url}}", label: "+ unsubscribe_url" },
];

export const MailPlaceholdersToolbar = ({
  onInsertMethod = "insertTag",
  placeholders = COMMON_EMAIL_PLACEHOLDERS,
}: {
  onInsertMethod?: string;
  placeholders?: PlaceholderDef[];
}) => {
  return (
    <div class="flex flex-wrap items-center gap-1.5 py-1">
      <span class="text-2xs font-semibold uppercase text-base-content/60 me-1">Variables:</span>
      {placeholders.map((p) => (
        <button
          key={p.tag}
          type="button"
          class="badge badge-sm badge-outline hover:badge-primary font-mono text-2xs cursor-pointer transition"
          x-on:click={`${onInsertMethod}('${p.tag}')`}
          title={`Insert ${p.tag}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};
