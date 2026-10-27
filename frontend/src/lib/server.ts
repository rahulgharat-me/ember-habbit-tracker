import "server-only";

/** Base URL of the FastAPI backend, for server components (the browser uses the /api proxy). */
function backendUrl(): string {
  return process.env.BACKEND_URL ?? `http://127.0.0.1:${process.env.BACKEND_PORT ?? 8000}`;
}

export interface AuthConfig {
  invite_only: boolean;
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  try {
    const response = await fetch(`${backendUrl()}/api/auth/config`, { cache: "no-store" });
    if (response.ok) return (await response.json()) as AuthConfig;
  } catch {
    // Backend not reachable: render the plain login page.
  }
  return { invite_only: false };
}
