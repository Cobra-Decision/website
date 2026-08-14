import type { Child } from "hono/jsx";
import { html } from "hono/html";

export const Layout = ({ children, title = "Website" }: { children: Child; title?: string }) => (
  <html lang="en" data-theme="corporate">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link href="/app.css" rel="stylesheet" />
      <script src="https://unpkg.com/htmx.org@2.0.4" />
      <script async defer src="/altcha.js" type="module" />
      <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" />
      <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('htmx:beforeSwap',(event)=>{const status=event.detail.xhr.status;if(status>=400&&status<500){event.detail.shouldSwap=true;event.detail.isError=false}});document.addEventListener('htmx:afterSettle',()=>document.querySelectorAll('[data-toast=success],[data-toast=info]').forEach((el)=>setTimeout(()=>el.remove(),4000)))" }} />
    </head>
    <body class="min-h-screen bg-base-200 text-base-content"><div id="toast-container" class="toast toast-top toast-end z-50"></div>{children}</body>
  </html>
);

export const Document = ({ children, title }: { children: Child; title?: string }) =>
  html`<!DOCTYPE html>${<Layout title={title}>{children}</Layout>}`;
