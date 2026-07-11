type BackendError = {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  payload?: {
    message?: string;
    fieldErrors?: Record<string, string>;
  };
};

const FIELD_MESSAGES: Record<string, string> = {
  qrToken: "QR token is missing. Scan the class QR again.",
  studentId: "Your student account is not linked correctly. Log out, log in again, then retry.",
  reason: "Reason is required for a late static QR check-in.",
  latitude: "GPS location is missing. Turn on Location for this site, then retry.",
  longitude: "GPS location is missing. Turn on Location for this site, then retry.",
  deviceId: "Device ID is missing. Reload the page, then retry.",
  ipAddress: "Network IP could not be detected. Reconnect and retry.",
};

export function getCheckInErrorMessage(json: unknown, fallback = "Check-in failed. Try again.") {
  const error = (json ?? {}) as BackendError;
  const message = error.payload?.message ?? error.message ?? error.error;
  const fieldErrors = error.payload?.fieldErrors ?? error.fieldErrors;

  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const details = Object.entries(fieldErrors)
      .map(([field, detail]) => FIELD_MESSAGES[field] ?? `${humanizeField(field)}: ${detail}`)
      .filter((detail, index, list) => list.indexOf(detail) === index);

    if (details.length > 0) return details.join(" ");
  }

  return message ?? fallback;
}

function humanizeField(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}
