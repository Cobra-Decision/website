import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { create, deriveHmacKeySecret, randomInt } from "altcha-lib/frameworks/hono";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { database } from "../../lib/database";
import { Login, Register } from "./views";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();
database.exec(schema);
database.run("INSERT OR IGNORE INTO roles (title, description) VALUES (?, ?)", ["member", "Default user role"]);

const altchaSecret = process.env.ALTCHA_HMAC_SECRET ?? "development-secret";
const altcha = create({
  hmacSignatureSecret: altchaSecret,
  hmacKeySignatureSecret: await deriveHmacKeySecret(altchaSecret),
  deriveKey,
  createChallengeParameters: () => ({
    algorithm: "PBKDF2/SHA-256",
    cost: 5000,
    counter: randomInt(5000, 10000),
    expiresAt: new Date(Date.now() + 600_000),
  }),
});
const jwtSecret = process.env.JWT_SECRET ?? "development-secret";
const invalidCredentials = () => <p class="alert alert-error">Invalid credentials.</p>;

export const auth = new Hono()
  .get("/", (c) => c.html(<Login />))
  .get("/register", (c) => c.html(<Register />))
  .get("/altcha/challenge", altcha.challengeHandler)
  .post("/login", altcha.middleware(), async (c) => {
    const form = await c.req.parseBody();
    const identifier = String(form.identifier ?? "").trim();
    const password = String(form.password ?? "");
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
  .post("/register", altcha.middleware(), async (c) => {
    const form = await c.req.parseBody();
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
