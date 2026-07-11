import { baseApi, unwrapContent, unwrapPayload, type ApiEnvelope, type PagePayload } from "@/store/api/baseApi";
import { todayIso } from "@/lib/utils/school-time";

export interface SessionDto {
  id: number;
  classroomId: number;
  classroomName: string;
  subjectName: string | null;
  teacherName: string;
  substituteTeacherId: number | null;
  substituteTeacherName: string | null;
  substituteReason: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: "UPCOMING" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  actualStartTime: string | null;
  actualEndTime: string | null;
  allowStaticQr: boolean | null;
  isQrActive: boolean | null;
  lateThresholdMinutes: number | null;
  earlyCheckinMinutes: number | null;
  studentAttendanceCutoffMinutes: number | null;
  gpsAllowedRadiusMeters: number | null;
}

export interface QrCodeDto {
  id: number;
  type: "DYNAMIC" | "STATIC";
  codeValue: string;
  expireTime: string | null;
}

export interface EnsureTodaySessionsResult {
  created: number;
  sessions: SessionDto[];
}

export const qrApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Idempotent on-demand session generator. The daily backend job runs at
     * 06:00 Phnom Penh time — schedules added later in the day produce no
     * session row until tomorrow. Call this first so today's session always
     * exists for the classroom you're about to take attendance for.
     */
    ensureTodaySessionsForClassroom: builder.mutation<EnsureTodaySessionsResult, number>({
      query: (classroomId) => ({
        url: `/sessions/classrooms/${classroomId}/ensure-today`,
        method: "POST",
      }),
      transformResponse: (response: ApiEnvelope<EnsureTodaySessionsResult>) => {
        const payload = unwrapPayload(response);
        return {
          created: payload?.created ?? 0,
          sessions: payload?.sessions ?? [],
        };
      },
      invalidatesTags: ["Session"],
    }),
    /** Today's sessions for a classroom — used to find the session to run "Take Attendance" for. */
    getTodaySessionsForClassroom: builder.query<SessionDto[], { classroomId: number }>({
      query: ({ classroomId }) => {
        const today = todayIso();
        return `/sessions/classrooms/${classroomId}?from=${today}&to=${today}&page=0&size=20`;
      },
      transformResponse: (response: ApiEnvelope<PagePayload<SessionDto> | SessionDto[]>) =>
        unwrapContent<SessionDto>(response),
      providesTags: ["Session"],
    }),
    getSession: builder.query<SessionDto, number>({
      query: (sessionId) => `/sessions/${sessionId}`,
      transformResponse: (response: ApiEnvelope<SessionDto>) => unwrapPayload(response),
      providesTags: (_r, _e, id) => [{ type: "Session", id }],
    }),
    /** Teacher manually starts the session (UPCOMING → ACTIVE), required before generating a dynamic QR. */
    openSession: builder.mutation<void, number>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/open`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [{ type: "Session", id }, "Session"],
    }),
    teacherCheckInSession: builder.mutation<void, { sessionId: number; teacherId: number | string; deviceId?: string | null }>({
      query: ({ sessionId, teacherId, deviceId }) => ({
        url: `/sessions/${sessionId}/teacher-check-in`,
        method: "POST",
        body: { teacherId: Number(teacherId), deviceId: deviceId ?? null },
      }),
      invalidatesTags: (_r, _e, { sessionId }) => [{ type: "Session", id: sessionId }, "Session"],
    }),
    /** Generates (and rotates) the dynamic QR for an ACTIVE session. */
    generateDynamicQr: builder.mutation<QrCodeDto, number>({
      query: (sessionId) => ({
        url: `/qr-codes/sessions/${sessionId}/dynamic`,
        method: "POST",
      }),
      transformResponse: (response: ApiEnvelope<QrCodeDto>) => unwrapPayload(response),
    }),
    /** Idempotent — returns the classroom's permanent static QR (auto-created when the classroom was made). */
    getClassroomStaticQr: builder.mutation<QrCodeDto, number>({
      query: (classroomId) => ({
        url: `/qr-codes/classrooms/${classroomId}/static`,
        method: "POST",
      }),
      transformResponse: (response: ApiEnvelope<QrCodeDto>) => unwrapPayload(response),
    }),
    /** All sessions (regular OR substitute) for a teacher in a date range — drives "My Classes" for substitutes. */
    getSessionsForTeacher: builder.query<SessionDto[], { teacherId: number | string; from: string; to: string }>({
      query: ({ teacherId, from, to }) =>
        `/sessions/teachers/${teacherId}?from=${from}&to=${to}&size=200`,
      transformResponse: (response: ApiEnvelope<PagePayload<SessionDto> | SessionDto[]>) =>
        unwrapContent<SessionDto>(response),
      providesTags: ["Session"],
    }),
    /** Admin assigns a substitute teacher for one specific session (Rule: substitute also sees the class in My Classes). */
    assignSubstitute: builder.mutation<void, { sessionId: number; substituteTeacherId: number; reason?: string }>({
      query: ({ sessionId, substituteTeacherId, reason }) => ({
        url: `/sessions/${sessionId}/assign-substitute`,
        method: "POST",
        body: { substituteTeacherId, reason: reason ?? null },
      }),
      invalidatesTags: (_r, _e, { sessionId }) => [{ type: "Session", id: sessionId }, "Session"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useEnsureTodaySessionsForClassroomMutation,
  useGetTodaySessionsForClassroomQuery,
  useGetSessionQuery,
  useOpenSessionMutation,
  useTeacherCheckInSessionMutation,
  useGenerateDynamicQrMutation,
  useGetClassroomStaticQrMutation,
  useGetSessionsForTeacherQuery,
  useAssignSubstituteMutation,
} = qrApi;
