/** Friendly, standard messages for technical HTTP statuses — never surface raw
 *  codes like "502" or "Internal Server Error" to the user. */
function friendlyForStatus(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "We couldn't find that — it may have been removed.";
  if (status === 408 || status === 504) return "The request timed out. Please try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "The server is having trouble right now. Please try again in a moment.";
  return fallback;
}

/** True for backend messages that are technical/unhelpful and shouldn't be shown. */
function isTechnicalMessage(msg: string): boolean {
  return /internal server error|unexpected error|null ?pointer|exception|sql|jpa|hibernate|stack ?trace|bad ?gateway|gateway ?timeout|^\d{3}$/i.test(
    msg.trim(),
  );
}

/**
 * Best-effort extraction of a human-readable, user-safe message from an RTK
 * Query / fetch error. Prefers a meaningful backend message; otherwise maps the
 * HTTP status to a standard friendly message. Never returns raw codes.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;

  if (error instanceof Error) {
    const m = error.message?.trim();
    return m && !isTechnicalMessage(m) ? m : fallback;
  }

  if (typeof error === "object") {
    const err = error as {
      data?: { payload?: { message?: string }; message?: string; error?: string };
      error?: string;
      message?: string;
      status?: number | string;
    };

    const raw =
      err.data?.payload?.message ??
      err.data?.message ??
      err.data?.error ??
      err.message ??
      err.error;

    // A real, non-technical backend message (e.g. "Email already exists",
    // "…can't be deleted") is the most useful thing to show.
    if (typeof raw === "string" && raw.trim() && !isTechnicalMessage(raw)) {
      return raw.trim();
    }

    // Network failure / no response.
    if (err.status === "FETCH_ERROR" || err.status === "TIMEOUT_ERROR") {
      return "Network problem. Check your connection and try again.";
    }
    // Otherwise map the HTTP status to a friendly message.
    const statusNum = typeof err.status === "number" ? err.status : Number(err.status);
    if (!Number.isNaN(statusNum)) {
      return friendlyForStatus(statusNum, fallback);
    }
  }

  return fallback;
}
