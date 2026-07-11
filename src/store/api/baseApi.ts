import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_URL } from '@/lib/api/api-config';

export interface ApiEnvelope<T> {
  payload?: T;
  message?: string;
  error?: string;
}

export interface PagePayload<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

export function unwrapPayload<T>(value: ApiEnvelope<T> | T): T {
  if (value && typeof value === "object" && "payload" in value) {
    return (value as ApiEnvelope<T>).payload as T;
  }
  return value as T;
}

export function unwrapContent<T>(value: ApiEnvelope<PagePayload<T> | T[]> | PagePayload<T> | T[]): T[] {
  const payload = unwrapPayload<PagePayload<T> | T[]>(value);
  if (Array.isArray(payload)) return payload;
  return payload?.content ?? [];
}

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: "include",
  }),
  tagTypes: [
    "Amendment",
    "Classroom",
    "Report",
    "Session",
    "Setting",
    "Student",
    "Teacher",
    "User",
  ],
  endpoints: () => ({}),
});
