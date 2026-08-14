export type Tag = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Meet = {
  id: number;
  title: string;
  description: string;
  topics: string | null;
  scheduled_at_utc: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  meet_url: string | null;
  image_url: string | null;
  presenter_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UserSummary = { id: number; email: string; username: string | null; first_name: string | null; last_name: string | null };

export type MeetWithDetails = Omit<Meet, "topics"> & {
  topics: string[];
  presenter: UserSummary | null;
  attendee_count: number;
  attendee_ids: number[];
  tags: Tag[];
};

export type CreateMeetInput = {
  title: string;
  description?: string;
  topics: string[];
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  meetUrl?: string | null;
  imageUrl?: string | null;
  presenterId?: number | null;
  tagIds: number[];
};
