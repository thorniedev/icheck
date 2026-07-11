// Domain Model Types

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'teacher' | 'student' | 'parent'
  schoolId: string
  avatar?: string
  phone?: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: Date
  updatedAt: Date
}

export interface School {
  id: string
  name: string
  code: string
  address: string
  city: string
  state: string
  country: string
  zipCode: string
  phone?: string
  email?: string
  website?: string
  logo?: string
  status: 'active' | 'inactive'
  adminId: string
  createdAt: Date
  updatedAt: Date
}

export interface Student {
  id: string
  userId: string
  schoolId: string
  enrollmentNumber: string
  dateOfBirth?: Date
  phone?: string
  address?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

export interface Teacher {
  id: string
  userId: string
  schoolId: string
  employeeId: string
  department?: string
  qualification?: string
  experience?: number
  phone?: string
  office?: string
  status: 'active' | 'inactive' | 'on-leave'
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  userAgent?: string
  ipAddress?: string
}

export interface RefreshToken {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  read: boolean
  createdAt: Date
  actionUrl?: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entity: string
  entityId: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}
