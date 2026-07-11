// API Request/Response Types

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
  timestamp: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ApiRequestConfig {
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  retries?: number
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    status: number
    details?: Record<string, unknown>
  }
}

export interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export type ApiResult<T> = SuccessResponse<T> | ErrorResponse
