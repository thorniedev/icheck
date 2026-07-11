// Reports Feature Types

export interface AttendanceReport {
  id: string
  classroomId: string
  reportType: 'student' | 'class' | 'teacher'
  period: 'weekly' | 'monthly' | 'semester' | 'custom'
  dateFrom: Date
  dateTo: Date
  data: ReportData
  generatedAt: Date
  generatedBy: string
}

export interface ReportData {
  totalClasses: number
  totalStudents: number
  attendanceByDate: AttendanceByDateRecord[]
  attendanceByStudent: AttendanceByStudentRecord[]
  attendanceSummary: AttendanceSummaryRecord
}

export interface AttendanceByDateRecord {
  date: Date
  totalPresent: number
  totalAbsent: number
  totalLate: number
  totalExcused: number
  attendancePercentage: number
}

export interface AttendanceByStudentRecord {
  studentId: string
  studentName: string
  enrollmentNumber?: string
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendancePercentage: number
  status: 'excellent' | 'good' | 'average' | 'poor'
}

export interface AttendanceSummaryRecord {
  totalPresent: number
  totalAbsent: number
  totalLate: number
  totalExcused: number
  avgAttendancePercentage: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface ReportFilter {
  classroomId?: string
  teacherId?: string
  dateFrom?: Date
  dateTo?: Date
  reportType?: AttendanceReport['reportType']
  format?: 'json' | 'csv' | 'pdf'
}

export interface ReportExportPayload {
  reportId: string
  format: 'csv' | 'pdf' | 'excel'
  includeCharts?: boolean
}

export interface ChartDataPoint {
  name: string
  value: number
  percentage: number
}

export interface ReportMetric {
  label: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease'
  unit?: string
}
