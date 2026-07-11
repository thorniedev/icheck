// Classrooms Feature Constants

export const CLASSROOM_CONSTANTS = {
  STATUS: {
    ACTIVE: 'active',
    ARCHIVED: 'archived',
    DRAFT: 'draft',
  } as const,

  ENROLLMENT_STATUS: {
    ACTIVE: 'active',
    DROPPED: 'dropped',
    COMPLETED: 'completed',
  } as const,

  DAYS_OF_WEEK: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ] as const,

  SEMESTERS: [1, 2] as const,

  API: {
    CLASSROOM_ENDPOINT: '/api/v1/classrooms',
    ENROLLMENT_ENDPOINT: '/api/v1/classrooms/enrollment',
    CLASSROOM_STUDENTS_ENDPOINT: '/api/v1/classrooms/:id/students',
  } as const,

  VALIDATION: {
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 100,
    CODE_PATTERN: /^[A-Z0-9]{3,10}$/,
    MIN_CLASSROOM_SIZE: 1,
    MAX_CLASSROOM_SIZE: 500,
  } as const,
} as const

export const CLASSROOM_STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-800',
  draft: 'bg-yellow-100 text-yellow-800',
} as const

export const GRADES = [
  'Nursery',
  'KG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
] as const
