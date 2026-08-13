import type { Child } from "hono/jsx";
import { html } from "hono/html";

export const Layout = ({ children, title = "Website" }: { children: Child; title?: string }) => (
  <html lang="en" data-theme="corporate">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link href="https://cdn.jsdelivr.net/npm/daisyui@4.12.24/dist/full.min.css" rel="stylesheet" />
      <script src="https://cdn.tailwindcss.com" />
      <script src="https://unpkg.com/htmx.org@2.0.4" />
      <script async defer src="https://cdn.jsdelivr.net/gh/altcha-org/altcha/dist/altcha.min.js" type="module" />
      <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" />
    </head>
    <body class="min-h-screen bg-base-200 text-base-content">{children}</body>
  </html>
);

export const Document = ({ children, title }: { children: Child; title?: string }) =>
  html`<!DOCTYPE html>${<Layout title={title}>{children}</Layout>}`;
