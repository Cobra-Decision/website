# CobraDecision

High-performance, memory-efficient modular monolith built with **Bun**, **Hono**, server-rendered **JSX**, **HTMX**, **Tailwind CSS + daisyUI**, **Alpine.js**, **SQLite (WAL)**, **ALTCHA**, and **JWT**.

---

## 🚀 Quick Local Development

```bash
# 1. Clone & Setup
git clone <repo-url> website && cd website
cp .env.example .env

# 2. Install Dependencies
bun install

# 3. Verify System
bun test
bun run typecheck

# 4. Seed Database (Optional)
bun run seed
# or: bun run seeding full

# 5. Start Development Server
bun run dev
```

Server runs at `http://localhost:3000`.

---

## 🛠️ Production Deployment (0 to 100)

### 1. Server Prerequisites
- Ubuntu 22.04+ / Debian 12 / Linux VPS
- Docker Engine & Docker Compose (`docker compose version >= 2.20`)
- Reverse Proxy (Nginx, Caddy, or Traefik) + SSL certificate (Certbot / Let's Encrypt)

---

### 2. Configure Environment (`.env`)

Create `.env` on your production host:

```bash
cp .env.example .env
nano .env
```

Set production values:

```env
# Runtime
NODE_ENV=production
PORT=3000

# Security (Generate random 32+ byte strings)
JWT_SECRET=your_super_strong_random_jwt_secret_here
ALTCHA_HMAC_SECRET=your_super_strong_random_altcha_secret_here

# Initial Super Admin (Created/promoted automatically on boot)
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your_secure_admin_password_123

# File Storage & Uploads
STORAGE_DIR=./public/uploads
ASSET_BASE_URL=/uploads

# Event Logging
LOG_DIR=./log

# Email / Mailer (Gmail SMTP or custom provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_google_app_password
SMTP_FROM="CobraDecision <your_email@gmail.com>"
MEET_REMINDER_DAYS_BEFORE=1
BASE_URL=https://yourdomain.com
```

---

### 3. Deploy with Docker Compose

```bash
# Build and start in detached mode
docker compose up -d --build

# Inspect running container
docker compose ps

# View live application logs
docker compose logs -f
```

Persistent data is mounted automatically:
- `./data` → SQLite database storage directory (holds `app.sqlite`, `app.sqlite-wal`, `app.sqlite-shm`)
- `./public/uploads` → Uploaded meeting images and presentation documents
- `./log` → Structured module event logs (`auth.log`, `email.log`, `meet.log`, `attendance.log`, `file.log`)

---

### 4. Reverse Proxy Setup (Nginx)

Create `/etc/nginx/sites-available/cobradecision`:

```nginx
server {
    server_name yourdomain.com;

    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable & acquire SSL:

```bash
sudo ln -s /etc/nginx/sites-available/cobradecision /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

### 5. Alternative: Bare-Metal Deployment (systemd)

```bash
# Build CSS assets
bun run build:css

# Run migrations/seeds
bun run seed

# Run server with systemd
sudo cp deploy/website.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now website
```

---

## ⚙️ Core Architecture & Features

| Module | Features & Capabilities |
|---|---|
| **Auth** | Multi-identifier login (email/username/phone), 6-digit OTP verification, bcrypt hashing, JWT session cookies, ALTCHA anti-bot PoW. |
| **Meets / Events** | Meeting lifecycle (upcoming, live, completed), public/private access, tags, attendee counters, auto-RSVP emails, attributed tracking links (`?ref=gmail`). |
| **Mail Management** | Zero-leak circular `RingBuffer`, batch sending (all users, tag followers, email domain, specific users), live preview with variable interpolation (`{{name}}`, `{{email}}`, etc.), RFC 2046 `multipart/mixed` file attachments, Gmail SMTP with App Passwords. |
| **File Management** | Dedicated file dashboard with preview, upload, rename, duplicate, and single/bulk deletion. Sanitized storage under `/public/uploads`. |
| **Event Logging** | Structured NDJSON event logging under `./log/` per module (`auth.log`, `email.log`, `meet.log`, `attendance.log`, `file.log`). |
| **SQL Reporting** | Super Admin ad-hoc analytical query engine with query validation and schema inspector. |
| **Performance & Memory** | SQLite WAL mode, memory temp store, 8MB bounded cache, asynchronous event logging, zero heap bloat on email batching. |

---

## 🧪 Testing & Verification

```bash
bun test        # Runs unit and integration suites
bun run check   # TypeScript static analysis
```

---

## 🗄️ Database Management & CLI

The SQLite database file is located at `data/app.sqlite` by default (mounted to `/app/data/app.sqlite` in Docker).

### Migrations

```bash
# Apply pending migrations
bun run migration
# alias: bun run migrate

# Check migration status
bun run migration status

# Rollback / migrate to a specific version
bun run migration --to=2
```

### Seeding

```bash
# Seed all
bun run seeding full
# alias: bun run seed full

# Seed specific feature (e.g. users, roles, meets, mailer, tags)
bun run seeding users
```

### Running CLI Inside Docker Container

```bash
# Run migrations inside running container
docker compose exec website bun run migration

# Run seeds inside running container
docker compose exec website bun run seeding full
docker compose exec website bun run seeding users
```
