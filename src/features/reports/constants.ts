// Reports Feature Constants

export const REPORTS_CONSTANTS = {
  REPORT_TYPES: {
    STUDENT: 'student',
    CLASS: 'class',
    TEACHER: 'teacher',
  } as const,

  PERIODS: {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    SEMESTER: 'semester',
    CUSTOM: 'custom',
  } as const,

  EXPORT_FORMATS: {
    JSON: 'json',
    CSV: 'csv',
    PDF: 'pdf',
    EXCEL: 'excel',
  } as const,

  ATTENDANCE_STATUS: {
    EXCELLENT: 'excellent', // >= 95%
    GOOD: 'good', // 85-94%
    AVERAGE: 'average', // 70-84%
    POOR: 'poor', // < 70%
  } as const,

  TREND: {
    IMPROVING: 'improving',
    STABLE: 'stable',
    DECLINING: 'declining',
  } as const,

  API: {
    REPORTS_ENDPOINT: '/api/v1/reports',
    EXPORT_ENDPOINT: '/api/v1/reports/export',
    METRICS_ENDPOINT: '/api/v1/reports/metrics',
  } as const,

  DEFAULTS: {
    DAYS_TO_SHOW: 30,
    MAX_STUDENTS_PER_REPORT: 500,
    CACHE_MINUTES: 60,
  } as const,
} as const

export const ATTENDANCE_STATUS_COLORS = {
  excellent: 'text-green-600 bg-green-50',
  good: 'text-blue-600 bg-blue-50',
  average: 'text-yellow-600 bg-yellow-50',
  poor: 'text-red-600 bg-red-50',
} as const

export const ATTENDANCE_STATUS_LABELS = {
  excellent: 'Excellent (95%+)',
  good: 'Good (85-94%)',
  average: 'Average (70-84%)',
  poor: 'Poor (<70%)',
} as const
