import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { Document } from "../../ui/layout";
import type { Claims } from "../auth/middleware";
import { attendMeet, getMeetById, leaveMeet, recordMeetVisit } from "./queries";
import { DynamicCtaButton, MeetAccessBanner, MeetingDetailPage } from "./views";
import { RsvpButton } from "../dashboard/user/views";
import { getLocale, formatLocalizedNumber } from "../../lib/i18n/context";
import { mailService } from "../mailer/service";
import { logger } from "../../lib/logger";

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
    const origin = new URL("/", c.req.url).origin;
    const user = await getSessionUser(getCookie(c, "session"));
    const isAuthenticated = Boolean(user);
    const isAttending = Boolean(user && meet.attendee_ids.includes(user.sub));

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: meet.title,
      description: meet.description || meet.title,
      startDate: `${meet.scheduled_date}T${meet.scheduled_time}:00Z`,
      eventStatus: meet.status === "completed" ? "https://schema.org/EventMovedOnline" : "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      location: {
        "@type": "VirtualLocation",
        url: `${origin}/meets/${meet.id}`,
      },
      organizer: {
        "@type": "Organization",
        name: "CobraDecision",
        url: origin,
      },
    };

    return c.html(
      <Document
        title={meet.title}
        description={meet.description || meet.title}
        canonicalUrl={`${origin}/meets/${meet.id}`}
        ogImage={meet.image_url || "/favicon.svg"}
        ogType="article"
        locale={locale}
        jsonLd={jsonLd}
      >
        <MeetingDetailPage meet={meet} isAuthenticated={isAuthenticated} isAttending={isAttending} locale={locale} />
      </Document>
    );
  });

  app.post("/:id/attend", async (c) => {
    const id = c.req.param("id");
    const locale = getLocale(c);
    const user = await getSessionUser(getCookie(c, "session"));
    if (!user) return c.html(<a href="/auth" class="btn btn-primary w-full">Sign In to Attend</a>, 401);

    const meetBefore = getMeetById(database, id);
    if (!meetBefore) return c.notFound();

    // Prevent attending completed meetings
    if (meetBefore.status === "completed") {
      if (c.req.header("HX-Target")?.startsWith("rsvp-btn-")) {
        return c.html(<RsvpButton meet={meetBefore} isAttending={false} locale={locale} />);
      }
      return c.html(
        <DynamicCtaButton meetId={id} isAuthenticated={true} isAttending={false} meetStatus={meetBefore.status} locale={locale} />,
        400
      );
    }

    attendMeet(database, id, user.sub);
    const meet = getMeetById(database, id);
    if (!meet) return c.notFound();

    logger.attendance("USER_ATTENDED", {
      actor: { userId: user.sub, ip: c.req.header("x-forwarded-for") ?? "local", userAgent: c.req.header("user-agent") },
      data: { meetId: id, meetTitle: meet.title, attendeeCount: meet.attendee_count },
    });

    // Send confirmation email asynchronously
    const attendeeUser = database
      .query<{ email: string; first_name: string | null; username: string | null }, [string]>(
        "SELECT email, first_name, username FROM users WHERE id = ? AND deleted_at IS NULL"
      )
      .get(user.sub);

    if (attendeeUser) {
      const presenterName = meet.presenter
        ? [meet.presenter.first_name, meet.presenter.last_name].filter(Boolean).join(" ") ||
          meet.presenter.username ||
          meet.presenter.email
        : undefined;

      mailService
        .sendMeetAttendanceEmail(
          {
            id: meet.id,
            title: meet.title,
            scheduledDate: meet.scheduled_date,
            scheduledTime: meet.scheduled_time,
            durationMinutes: meet.duration_minutes,
            presenterName,
            status: meet.status,
            accessStatus: meet.access_status,
          },
          {
            email: attendeeUser.email,
            firstName: attendeeUser.first_name,
            username: attendeeUser.username,
          }
        )
        .catch((err) => console.error("[Events] RSVP email failed:", err));
    }

    // If request comes from member dashboard RSVP button
    if (c.req.header("HX-Target")?.startsWith("rsvp-btn-")) {
      return c.html(<RsvpButton meet={meet} isAttending={true} locale={locale} />);
    }

    const formattedAttendeeCount = formatLocalizedNumber(meet.attendee_count, locale);

    return c.html(
      <>
        <DynamicCtaButton meetId={id} isAuthenticated={true} isAttending={true} meetStatus={meet.status} locale={locale} />
        <div id="meet-access-box" hx-swap-oob="outerHTML" class="w-full">
          <MeetAccessBanner meet={meet} isAuthenticated={true} isAttending={true} locale={locale} />
        </div>
        <span id="meet-attendee-count" hx-swap-oob="innerHTML">{formattedAttendeeCount}</span>
      </>
    );
  });

  app.delete("/:id/attend", async (c) => {
    const id = c.req.param("id");
    const locale = getLocale(c);
    const user = await getSessionUser(getCookie(c, "session"));
    if (!user) return c.html(<a href="/auth" class="btn btn-primary w-full">Sign In to Attend</a>, 401);

    leaveMeet(database, id, user.sub);
    const meet = getMeetById(database, id);
    if (!meet) return c.notFound();

    logger.attendance("USER_UNATTENDED", {
      actor: { userId: user.sub, ip: c.req.header("x-forwarded-for") ?? "local", userAgent: c.req.header("user-agent") },
      data: { meetId: id, meetTitle: meet.title, attendeeCount: meet.attendee_count },
    });

    // If request comes from member dashboard RSVP button
    if (c.req.header("HX-Target")?.startsWith("rsvp-btn-")) {
      return c.html(<RsvpButton meet={meet} isAttending={false} locale={locale} />);
    }

    const formattedAttendeeCount = formatLocalizedNumber(meet.attendee_count, locale);

    return c.html(
      <>
        <DynamicCtaButton meetId={id} isAuthenticated={true} isAttending={false} meetStatus={meet.status} locale={locale} />
        <div id="meet-access-box" hx-swap-oob="outerHTML" class="w-full">
          <MeetAccessBanner meet={meet} isAuthenticated={true} isAttending={false} locale={locale} />
        </div>
        <span id="meet-attendee-count" hx-swap-oob="innerHTML">{formattedAttendeeCount}</span>
      </>
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
