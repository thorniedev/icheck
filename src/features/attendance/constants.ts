// Attendance Feature Constants

export const ATTENDANCE_CONSTANTS = {
  STATUS: {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    EXCUSED: 'excused',
  } as const,

  CHECK_IN_METHODS: {
    QR: 'qr',
    MANUAL: 'manual',
    GEOLOCATION: 'geolocation',
  } as const,

  SESSION_STATUS: {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  } as const,

  QR_CODE: {
    SIZE: 256,
    ERROR_CORRECTION: 'H',
    VALIDITY_MINUTES: 60,
  } as const,

  CHECK_IN: {
    GRACE_PERIOD_MINUTES: 5,
    LATE_THRESHOLD_MINUTES: 15,
    GEOLOCATION_ACCURACY_METERS: 100,
  } as const,

  API: {
    ATTENDANCE_ENDPOINT: '/api/v1/attendance',
    QR_SESSION_ENDPOINT: '/api/v1/attendance/qr-session',
    CHECK_IN_ENDPOINT: '/api/v1/attendance/check-in',
  } as const,
} as const

export const ATTENDANCE_STATUS_COLORS = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  excused: 'bg-blue-100 text-blue-800',
} as const
