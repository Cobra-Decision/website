import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { Document } from "../../ui/layout";
import type { Claims } from "../auth/middleware";
import { attendMeet, getMeetById, leaveMeet, recordMeetVisit } from "./queries";
import { DynamicCtaButton, MeetingDetailPage } from "./views";
import { RsvpButton } from "../dashboard/user/views";
import { getLocale } from "../../lib/i18n/context";

export function createEventsRoutes(database: Database, jwtSecret = process.env.JWT_SECRET ?? "development-secret") {
  const app = new Hono();

  const getSessionUser = async (cookieHeader: string | undefined): Promise<Claims | null> => {
    if (!cookieHeader) return null;
    try {
      return (await verify(cookieHeader, jwtSecret, "HS256")) as unknown as Claims;
    } catch {
      return null;
    }
  };

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const platformSlug = c.req.query("platform");
    recordMeetVisit(database, id, platformSlug);

    const meet = getMeetById(database, id);
    if (!meet) return c.notFound();

    const locale = getLocale(c);
    const user = await getSessionUser(getCookie(c, "session"));
    const isAuthenticated = Boolean(user);
    const isAttending = Boolean(user && meet.attendee_ids.includes(user.sub));

    return c.html(
      <Document title={`${meet.title} | CobraDecision`} locale={locale}>
        <MeetingDetailPage meet={meet} isAuthenticated={isAuthenticated} isAttending={isAttending} locale={locale} />
      </Document>
    );
  });

  app.post("/:id/attend", async (c) => {
    const id = c.req.param("id");
    const locale = getLocale(c);
    const user = await getSessionUser(getCookie(c, "session"));
    if (!user) return c.html(<a href={`/auth?redirect=/meets/${id}`} class="btn btn-primary w-full">Sign In to Attend</a>, 401);

    attendMeet(database, id, user.sub);
    const meet = getMeetById(database, id);
    if (!meet) return c.notFound();

    // If request comes from member dashboard RSVP button
    if (c.req.header("HX-Target")?.startsWith("rsvp-btn-")) {
      return c.html(<RsvpButton meet={meet} isAttending={true} locale={locale} />);
    }

    return c.html(
      <div id="attend-action">
        <DynamicCtaButton meetId={id} isAuthenticated={true} isAttending={true} locale={locale} />
      </div>
    );
  });

  app.delete("/:id/attend", async (c) => {
    const id = c.req.param("id");
    const locale = getLocale(c);
    const user = await getSessionUser(getCookie(c, "session"));
    if (!user) return c.html(<a href={`/auth?redirect=/meets/${id}`} class="btn btn-primary w-full">Sign In to Attend</a>, 401);

    leaveMeet(database, id, user.sub);
    const meet = getMeetById(database, id);
    if (!meet) return c.notFound();

    // If request comes from member dashboard RSVP button
    if (c.req.header("HX-Target")?.startsWith("rsvp-btn-")) {
      return c.html(<RsvpButton meet={meet} isAttending={false} locale={locale} />);
    }

    return c.html(
      <div id="attend-action">
        <DynamicCtaButton meetId={id} isAuthenticated={true} isAttending={false} locale={locale} />
      </div>
    );
  });

  return app;
}

export const events = new Hono().get("/", (c) =>
  c.html(
    <main>
      <h1>Events</h1>
      <a href="/">Back home</a>
    </main>
  )
);
