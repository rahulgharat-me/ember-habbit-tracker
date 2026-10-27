/** A calendar date in `YYYY-MM-DD` form (no time zone). */
export type ISODate = string;

export interface CurrentUser {
  login: string;
  name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  pending_access_requests: number;
}

export type AccessStatus = "pending" | "approved" | "denied" | "revoked";

export interface AccessRequest {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  status: AccessStatus;
  /** UTC timestamp without zone suffix, as stored by the API. */
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface Habit {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  start_date: ISODate;
  archived_on: ISODate | null;
  is_archived: boolean;
  /** Weekdays the habit is not required on (0 = Monday … 6 = Sunday). */
  skip_weekdays: number[];
  /** Specific days the habit is not required on. */
  skip_dates: ISODate[];
}

export interface HabitInput {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
  start_date?: ISODate;
  skip_weekdays?: number[];
  skip_dates?: ISODate[];
}

export interface HabitUpdate extends Partial<HabitInput> {
  archived?: boolean;
}

export interface HabitLog {
  habit_id: number;
  date: ISODate;
  completed: boolean;
}

export interface HabitStats {
  habit_id: number;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  completion_rate_30d: number;
}

export interface Summary {
  today: ISODate;
  current_streak: number;
  longest_streak: number;
  perfect_days: number;
  today_total: number;
  today_completed: number;
  habits: HabitStats[];
}

export type DayStatus = "complete" | "partial" | "missed" | "pending" | "future" | "empty" | "rest";

export interface CalendarDay {
  date: ISODate;
  total: number;
  completed: number;
  missed: number;
  status: DayStatus;
}

export interface WeekdayStat {
  weekday: number;
  possible: number;
  completed: number;
  rate: number;
}

export interface WeekStat {
  week_start: ISODate;
  possible: number;
  completed: number;
  rate: number;
}

export interface Insights {
  weekdays: WeekdayStat[];
  weeks: WeekStat[];
}
