export type Tag = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MeetStatus = "upcoming" | "live" | "completed";
export type MeetAccessStatus = "public" | "private";

export type Meet = {
  id: string;
  title: string;
  description: string;
  topics: string | null;
  scheduled_at_utc: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  meet_url: string | null;
  video_url: string | null;
  file_url: string | null;
  image_url: string | null;
  status: MeetStatus;
  access_status: MeetAccessStatus;
  presenter_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UserSummary = {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type MeetWithDetails = Omit<Meet, "topics"> & {
  topics: string[];
  presenter: UserSummary | null;
  attendee_count: number;
  attendee_ids: string[];
  tags: Tag[];
};

export type CreateMeetInput = {
  id?: string;
  title: string;
  description?: string;
  topics: string[];
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  meetUrl?: string | null;
  videoUrl?: string | null;
  fileUrl?: string | null;
  imageUrl?: string | null;
  status?: MeetStatus;
  accessStatus?: MeetAccessStatus;
  presenterId?: string | null;
  tagIds: string[];
};
