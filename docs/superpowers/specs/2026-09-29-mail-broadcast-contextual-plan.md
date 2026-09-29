# Mail Scheduler: Contextual Broadcasts, Live Preview & Unified Date/Time

## Objective
Enable manual and scheduled sending of contextual event emails (such as tag reminders, RSVP reminders, and custom announcements) from the Admin Mail Scheduler dashboard with:
1. **Meeting / Event Context**: Dynamic binding to a specific meeting.
2. **Unified DatePicker & Time**: Using the project's `<DatePicker />` (Shamsi/Gregorian support, cross-browser reliable).
3. **Live Email Preview**: Interactive interpolated preview (HTML & Markdown) with sample/meeting variables before sending.
4. **Immediate Send (Run Now)**: Bypass future scheduling to dispatch immediately.

---

## Key Architecture & Components

### 1. Unified Date & Time Controls
- Component: `src/ui/date-picker.tsx` (`<DatePicker name="scheduleDate" locale={locale} />`)
- Time input: `<input type="time" name="scheduleTime" class="input input-bordered input-xs" />`
- Combined on submit into ISO datetime (`toUtcIso(scheduleDate, scheduleTime)` or local ISO string).

### 2. Event / Meeting Context Dropdown
- Upcoming meets queried in admin route (`getMailSchedulerState`):
  `SELECT id, title, scheduled_date, scheduled_time, status FROM meets WHERE deleted_at IS NULL ORDER BY scheduled_date DESC LIMIT 50`
- Passed to `MailSchedulerView`.
- In Alpine state:
  - `allMeets`: list of meetings.
  - `selectedMeetId`: currently selected meet ID.
  - When `selectedMeetId` is set, enables target modes:
    - `meet_attendees`: Attendees registered for the meeting.
    - `tag_followers`: Users following the meeting's tags.
  - Injects meet variables into live preview.

### 3. Live Interpolated Preview
- Alpine computed property `interpolatedPreview` in `MailSchedulerView`:
  - Dynamically replaces `{{name}}`, `{{email}}`, `{{first_name}}`, `{{last_name}}`, `{{username}}`, `{{date}}`, `{{date_shamsi}}`, `{{dashboard_url}}`, `{{unsubscribe_url}}`.
  - Dynamically replaces `{{meet_title}}`, `{{meet_date}}`, `{{meet_date_shamsi}}`, `{{meet_time}}`, `{{meet_duration}}`, `{{presenter_name}}`, `{{meet_link}}`, `{{tags}}`, `{{meet_start_utc}}`, etc. based on `selectedMeetId` (or default sample).
  - Renders markdown via `marked` or HTML sanitization.
- Toggle between **"Compose"** and **"Live Preview"** tabs in the Broadcast card.

### 4. Backend Processing (`service.ts` & `routes.tsx`)
- `mailService.sendBatchEmails(db, filter, subject, body, format)`:
  - Supports `filter.mode = "meet_attendees" | "tag_followers"` with `filter.meetId`.
  - When `filter.meetId` is present, queries meeting details & tags, calculating Persian date and UTC calendar slots, injecting `meet_*` variables for each recipient.
- Route `/dashboard/admin/mail-scheduler/schedule`:
  - If `sendNow === "true"`, immediately runs `mailService.sendBatchEmails()` and records `status = 'sent'`.
  - If scheduled, computes ISO timestamp from `scheduleDate` + `scheduleTime` and inserts into `scheduled_emails`.

---

## File Modification Checklist
1. `src/modules/mailer/types.ts`: Update `BatchFilterOptions` (`meet_attendees`, `tag_followers`, `meetId`).
2. `src/modules/mailer/service.ts`:
   - Meet variable interpolation & attendee/tag follower recipient resolution in `sendBatchEmails`.
   - `forceNow` bypass in `sendFavoriteTagMeetReminders` and `sendMeetAttendeesReminder`.
3. `src/modules/admin/routes.tsx`:
   - Query `meets` in `getMailSchedulerState`.
   - Process `meetId`, `sendNow`, `scheduleDate`, `scheduleTime` in `/mail-scheduler/schedule`.
4. `src/modules/admin/mail-scheduler-views.tsx`:
   - Add `<DatePicker />` and time input.
   - Add Meet selector, Live Preview tab, and Send Immediately toggle.
5. `src/modules/mailer/mailer.test.ts`: Add tests for contextual batch sending.
