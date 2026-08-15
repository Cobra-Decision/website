export type Registration = {
  email: string;
  password: string;
  username: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  tagIds: string[];
};

const optional = (value: unknown) => String(value ?? "").trim() || null;

export function normalizeRegistration(form: Record<string, unknown>): Registration | null {
  const email = String(form.email ?? "").trim().toLowerCase();
  const password = String(form.password ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password !== String(form.password_confirmation ?? "")) return null;

  // Extract tagIds (can be single string, array of strings, or undefined)
  let tagIds: string[] = [];
  if (Array.isArray(form.tagIds)) {
    tagIds = form.tagIds.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof form.tagIds === "string" && form.tagIds.trim()) {
    tagIds = [form.tagIds.trim()];
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
