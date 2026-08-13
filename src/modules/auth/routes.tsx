import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { database } from "../../lib/database";
import { Login, Register } from "./views";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();
database.exec(schema);
database.run("INSERT OR IGNORE INTO roles (title, description) VALUES (?, ?)", ["member", "Default user role"]);

const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const jwtSecret = process.env.JWT_SECRET ?? "development-secret";
const invalidCredentials = () => <p class="alert alert-error">Invalid credentials.</p>;

async function verifyTurnstile(token: string | undefined, remoteIp?: string) {
  if (!turnstileSecret || !token) return false;
  const body = new URLSearchParams({ secret: turnstileSecret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  return response.ok && (await response.json() as { success?: boolean }).success === true;
}

export const auth = new Hono()
  .get("/", (c) => c.html(<Login />))
  .get("/register", (c) => c.html(<Register />))
  .post("/login", async (c) => {
    const form = await c.req.parseBody();
    const identifier = String(form.identifier ?? "").trim();
    const password = String(form.password ?? "");
    const captcha = String(form["cf-turnstile-response"] ?? "");
    if (!(await verifyTurnstile(captcha, c.req.header("cf-connecting-ip")))) {
      return c.html(<p class="alert alert-error">Captcha verification failed.</p>, 400);
    }
    const user = database.query<{
      id: number; username: string; password_hash: string; role_id: number; role_title: string;
    }, [string, string, string]>(`SELECT u.id, u.username, u.password_hash, u.role_id, r.title role_title
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE (u.email = ? OR u.phone = ? OR u.username = ?)
        AND u.deleted_at IS NULL AND r.deleted_at IS NULL`).get(identifier, identifier, identifier);
    if (!user || !(await Bun.password.verify(password, user.password_hash))) return c.html(invalidCredentials(), 401);
    const token = await sign({ sub: String(user.id), username: user.username, role_title: user.role_title, role_id: user.role_id }, jwtSecret, "HS256");
    setCookie(c, "session", token, { httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
    return c.html(<p class="alert alert-success">Signed in successfully.</p>);
  })
  .post("/register", async (c) => {
    const form = await c.req.parseBody();
    const captcha = String(form["cf-turnstile-response"] ?? "");
    if (!(await verifyTurnstile(captcha, c.req.header("cf-connecting-ip")))) {
      return c.html(<p class="alert alert-error">Captcha verification failed.</p>, 400);
    }
    const username = String(form.username ?? "").trim();
    const email = String(form.email ?? "").trim();
    const phone = String(form.phone ?? "").trim();
    const password = String(form.password ?? "");
    const firstName = String(form.first_name ?? "").trim();
    const lastName = String(form.last_name ?? "").trim();
    if (!username || !email || !phone || !password || !firstName || !lastName) {
      return c.html(<p class="alert alert-error">All fields are required.</p>, 400);
    }
    try {
      const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get();
      if (!role) return c.html(<p class="alert alert-error">Registration is unavailable.</p>, 500);
      const passwordHash = await Bun.password.hash(password);
      database.run(
        `INSERT INTO users (username, email, phone, password_hash, first_name, last_name, role_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [username, email, phone, passwordHash, firstName, lastName, role.id],
      );
      return c.html(<p class="alert alert-success">Account created. <a href="/auth">Sign in</a>.</p>);
    } catch {
      return c.html(<p class="alert alert-error">That username, email, or phone is already in use.</p>, 409);
    }
  });
