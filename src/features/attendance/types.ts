// Attendance Feature Types

export interface AttendanceRecord {
  id: string
  studentId: string
  classroomId: string
  timestamp: Date
  status: 'present' | 'absent' | 'late' | 'excused'
  checkedInVia: 'qr' | 'manual' | 'geolocation'
  notes?: string
  amendedBy?: string
  amendedAt?: Date
}

export interface AttendanceSession {
  id: string
  classroomId: string
  startTime: Date
  endTime?: Date
  qrToken: string
  status: 'active' | 'completed' | 'cancelled'
  recordsCount: number
}

export interface AttendanceStats {
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  presentPercentage: number
}

export interface QRCheckInPayload {
  qrToken: string
  studentId: string
  timestamp: Date
  userAgent: string
  ipAddress?: string
  location?: {
    latitude: number
    longitude: number
  }
}

export interface AttendanceFilter {
  classroomId?: string
  studentId?: string
  dateFrom?: Date
  dateTo?: Date
  status?: AttendanceRecord['status']
}
