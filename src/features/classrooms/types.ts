// Classrooms Feature Types

export interface Classroom {
  id: string
  name: string
  code: string
  description?: string
  schoolId: string
  teacherId: string
  academicYear: string
  semester: number
  grade?: string
  section?: string
  schedule?: ClassroomSchedule[]
  studentCount: number
  status: 'active' | 'archived' | 'draft'
  createdAt: Date
  updatedAt: Date
}

export interface ClassroomSchedule {
  id: string
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  room?: string
  notes?: string
}

export interface ClassroomEnrollment {
  id: string
  classroomId: string
  studentId: string
  enrollmentDate: Date
  status: 'active' | 'dropped' | 'completed'
  enrollmentNumber?: string
}

export interface ClassroomStudent {
  id: string
  studentId: string
  studentName: string
  email: string
  rollNumber?: string
  status: 'active' | 'dropped'
  enrollmentDate: Date
}

export interface ClassroomFilter {
  schoolId?: string
  teacherId?: string
  academicYear?: string
  status?: Classroom['status']
  searchTerm?: string
}

export interface CreateClassroomPayload {
  name: string
  code: string
  description?: string
  academicYear: string
  semester: number
  grade?: string
  section?: string
  schedule?: ClassroomSchedule[]
}

export interface UpdateClassroomPayload extends Partial<CreateClassroomPayload> {
  status?: Classroom['status']
}
