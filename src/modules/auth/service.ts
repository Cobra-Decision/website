export type Registration = {
  email: string;
  password: string;
  username: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  tagIds: string[];
};

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const optional = (value: unknown) => String(first(value) ?? "").trim() || null;

export function normalizeRegistration(form: Record<string, unknown>): Registration | null {
  const email = String(first(form.email) ?? "").trim().toLowerCase();
  const password = String(first(form.password) ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password !== String(first(form.password_confirmation) ?? "")) return null;

  // Extract tagIds (support array from form or individual field)
  let tagIds: string[] = [];
  if (Array.isArray(form.tagIds)) {
    tagIds = form.tagIds.map((t) => String(t).trim()).filter(Boolean);
  } else if (Array.isArray(form["tagIds[]"])) {
    tagIds = (form["tagIds[]"] as unknown[]).map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof form.tagIds === "string" && form.tagIds.trim()) {
    tagIds = [form.tagIds.trim()];
  } else if (typeof form["tagIds[]"] === "string" && form["tagIds[]"].trim()) {
    tagIds = [form["tagIds[]"].trim()];
  }

  // Enforce at least 3 preferred tags on registration
  if (tagIds.length < 3) {
    return null;
  }

  return {
    email,
    password,
    username: optional(form.username),
    phone: optional(form.phone),
    firstName: optional(form.first_name),
    lastName: optional(form.last_name),
    tagIds,
  };
}
