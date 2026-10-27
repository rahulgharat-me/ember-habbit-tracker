import type {
  AccessRequest,
  AccessStatus,
  CalendarDay,
  CurrentUser,
  Habit,
  HabitInput,
  HabitLog,
  HabitUpdate,
  Insights,
  ISODate,
  Summary,
} from "@/lib/types";

// Same-origin: Next.js proxies /api to the backend (see next.config.ts), so the session
// cookie is sent automatically and no CORS is involved.
const API_PREFIX = "/api";
export const LOGIN_PATH = "/login";
/** Pages reachable without signing in; they render without the app navigation. */
export const PUBLIC_PATHS = [LOGIN_PATH, "/about"];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return `${API_PREFIX}${path}${search ? `?${search}` : ""}`;
}

async function request<T>(path: string, init: RequestInit = {}, query?: Query): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }

  if (response.status === 401 && path !== "/auth/me") {
    // Session expired or revoked: start over at the login page.
    window.location.assign(LOGIN_PATH);
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetail(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    // FastAPI validation errors: [{ loc, msg, ... }]
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    // Non-JSON error body; fall through.
  }
  return response.statusText || `Request failed (${response.status})`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export const api = {
  me: () => request<CurrentUser>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),

  listAccessRequests: (status?: AccessStatus) =>
    request<AccessRequest[]>("/admin/access-requests", {}, { status }),
  decideAccessRequest: (id: number, status: Exclude<AccessStatus, "pending">) =>
    request<AccessRequest>(`/admin/access-requests/${id}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  listHabits: (includeArchived = false) =>
    request<Habit[]>("/habits", {}, { include_archived: includeArchived }),
  createHabit: (input: HabitInput) =>
    request<Habit>("/habits", { method: "POST", body: JSON.stringify(input) }),
  updateHabit: (id: number, input: HabitUpdate) =>
    request<Habit>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteHabit: (id: number) => request<void>(`/habits/${id}`, { method: "DELETE" }),
  addSkipDate: (habitId: number, date: ISODate) =>
    request<Habit>(`/habits/${habitId}/skips/${date}`, { method: "PUT" }),
  removeSkipDate: (habitId: number, date: ISODate) =>
    request<Habit>(`/habits/${habitId}/skips/${date}`, { method: "DELETE" }),

  setLog: (habitId: number, date: ISODate, completed: boolean) =>
    request<HabitLog>(`/habits/${habitId}/logs/${date}`, {
      method: "PUT",
      body: JSON.stringify({ completed }),
    }),
  clearLog: (habitId: number, date: ISODate) =>
    request<void>(`/habits/${habitId}/logs/${date}`, { method: "DELETE" }),
  listLogs: (start: ISODate, end: ISODate, habitId?: number) =>
    request<HabitLog[]>("/logs", {}, { start, end, habit_id: habitId }),

  getSummary: (today: ISODate) => request<Summary>("/stats/summary", {}, { today }),
  getCalendar: (start: ISODate, end: ISODate, today: ISODate, habitId?: number) =>
    request<CalendarDay[]>("/stats/calendar", {}, { start, end, today, habit_id: habitId }),
  getInsights: (today: ISODate, days = 90, weeks = 12) =>
    request<Insights>("/stats/insights", {}, { today, days, weeks }),
};
