import { getServerUser } from "@/auth-server";
import { backendFetch } from "@/lib/api-fetch";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCodeIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { ScheduleAddButton, ScheduleRowActions, ItePresetButton } from "@/components/schedule-actions";
import { schoolToday, todayIso } from "@/lib/utils/school-time";

interface ClassroomLite { id: number; className: string; }

async function fetchClassroomsForPicker(): Promise<ClassroomLite[]> {
  try {
    const res = await backendFetch(`/classrooms?size=200`);
    if (!res.ok) return [];
    const list = (await res.json())?.payload?.content ?? [];
    return list.map((c: { id: number; className: string }) => ({ id: c.id, className: c.className }));
  } catch { return []; }
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
type Day = typeof DAYS[number];
const DAY_SHORT: Record<Day, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};
const DAY_FULL: Record<Day, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

interface ScheduleItem {
  id: number;
  classId?: number;
  className: string;
  teacherId?: number;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slot: number;
  status: boolean;
}
interface SessionItem {
  id: number;
  classroomName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

function scheduleTitle() {
  return "Attendance Session";
}

function sessionKey(className: string, startTime: string, endTime: string) {
  return `${className}:${startTime?.slice(0, 5)}:${endTime?.slice(0, 5)}`;
}

async function fetchAllSchedules(): Promise<ScheduleItem[]> {
  try {
    const res = await backendFetch(`/schedules?size=200`);
    if (!res.ok) return [];
    return (await res.json())?.payload?.content ?? [];
  } catch { return []; }
}

async function fetchTeacherSchedules(teacherId: string): Promise<ScheduleItem[]> {
  try {
    const res = await backendFetch(`/schedules/teachers/${teacherId}?size=100`);
    if (!res.ok) return [];
    return (await res.json())?.payload?.content ?? [];
  } catch { return []; }
}

async function fetchTodaySessions(teacherId: string): Promise<SessionItem[]> {
  try {
    const res = await backendFetch(`/sessions/teachers/${teacherId}/upcoming?size=20`);
    if (!res.ok) return [];
    // Compare against today in school local time, NOT the container's UTC clock,
    // otherwise on Friday 00:30 +07 we'd ask for Thursday and get nothing.
    const today = todayIso();
    return ((await res.json())?.payload?.content ?? []).filter((s: SessionItem) => s.sessionDate === today);
  } catch { return []; }
}

const statusBg: Record<string, string> = {
  UPCOMING: "border-l-blue-400  bg-blue-50",
  SCHEDULED: "border-l-blue-400  bg-blue-50",
  ACTIVE:    "border-l-green-500 bg-green-50",
  COMPLETED: "border-l-gray-300  bg-muted/50",
  CANCELLED: "border-l-red-400   bg-red-50",
};
const statusText: Record<string, string> = {
  UPCOMING: "text-blue-700",
  SCHEDULED: "text-blue-700",
  ACTIVE:    "text-green-700",
  COMPLETED: "text-muted-foreground",
  CANCELLED: "text-red-600",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const user   = await getServerUser();
  const role   = user?.role ?? "ADMIN";
  const userId = user?.id ?? "1";

  const { day: dayParam } = await searchParams;
  const selectedDay = DAYS.find((d) => d === dayParam?.toUpperCase()) ?? null;

  const isAdmin = role === "ADMIN";

  const [schedules, todaySessions, classroomOptions] = await Promise.all([
    role === "TEACHER" ? fetchTeacherSchedules(userId) : fetchAllSchedules(),
    role === "TEACHER" ? fetchTodaySessions(userId) : Promise.resolve([]),
    isAdmin ? fetchClassroomsForPicker() : Promise.resolve([] as ClassroomLite[]),
  ]);

  const byDay: Record<string, ScheduleItem[]> = Object.fromEntries(DAYS.map((d) => [d, []]));
  for (const s of schedules) {
    const key = s.dayOfWeek?.toUpperCase();
    if (key && byDay[key]) byDay[key].push(s);
  }
  for (const day of DAYS) byDay[day].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const todayMap = new Map<string, SessionItem>();
  for (const ts of todaySessions) {
    todayMap.set(sessionKey(ts.classroomName, ts.startTime, ts.endTime), ts);
  }

  // "Today" must reflect the school's wall clock, not the container's UTC clock.
  const todayDow = schoolToday().weekday as Day;
  const totalSchedules = schedules.length;

  const selectedIdx = selectedDay ? DAYS.indexOf(selectedDay) : -1;
  const prevDay = selectedIdx > 0 ? DAYS[selectedIdx - 1] : null;
  const nextDay = selectedIdx >= 0 && selectedIdx < DAYS.length - 1 ? DAYS[selectedIdx + 1] : null;

  return (
    <div className="px-4 sm:px-5 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Schedule</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{totalSchedules} schedule{totalSchedules !== 1 ? "s" : ""}</span>
          {isAdmin && <ItePresetButton classrooms={classroomOptions} />}
          {isAdmin && <ScheduleAddButton classrooms={classroomOptions} />}
        </div>
      </div>
      <p className="text-sm text-muted-foreground/70 mb-6">
        {role === "ADMIN" ? "All teachers · weekly view" : "Your weekly timetable"}
      </p>

      <div className="flex items-center gap-1 mb-6 bg-muted p-1 rounded-xl w-fit">
        <Link
          href="/schedule"
          className={`px-4 py-1.5 rounded-lg text-base font-medium transition-colors ${
            !selectedDay
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          Week
        </Link>
        {DAYS.map((day) => {
          const isToday  = day === todayDow;
          const isActive = day === selectedDay;
          return (
            <Link
              key={day}
              href={`/schedule?day=${day}`}
              className={`px-4 py-1.5 rounded-lg text-base font-medium transition-colors relative ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isToday
                  ? "text-primary font-semibold hover:bg-card"
                  : "text-muted-foreground hover:text-foreground/80 hover:bg-card"
              }`}
            >
              <span className="hidden sm:inline">{DAY_SHORT[day]}</span>
              <span className="sm:hidden">{DAY_SHORT[day].charAt(0)}</span>
              {isToday && !isActive && (
                <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>

      {totalSchedules === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border text-muted-foreground/70">
          <p className="font-medium">No schedules found.</p>
          <p className="mt-1 text-base">{role === "TEACHER" ? "You have no scheduled classes." : "No schedules have been created yet."}</p>
        </div>
      ) : selectedDay ? (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">{DAY_FULL[selectedDay]}</h2>
              {selectedDay === todayDow && (
                <Badge className="bg-primary text-primary-foreground hover:bg-primary text-xs">Today</Badge>
              )}
              <span className="text-sm text-muted-foreground/70">{byDay[selectedDay].length} class{byDay[selectedDay].length !== 1 ? "es" : ""}</span>
            </div>
            <div className="flex items-center gap-1">
              {prevDay ? (
                <Link href={`/schedule?day=${prevDay}`}>
                  <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                    <ChevronLeftIcon className="size-4" />
                    <span className="hidden sm:inline">{DAY_SHORT[prevDay]}</span>
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="h-8 px-2" disabled>
                  <ChevronLeftIcon className="size-4" />
                </Button>
              )}
              {nextDay ? (
                <Link href={`/schedule?day=${nextDay}`}>
                  <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                    <span className="hidden sm:inline">{DAY_SHORT[nextDay]}</span>
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="h-8 px-2" disabled>
                  <ChevronRightIcon className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {byDay[selectedDay].length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border text-muted-foreground/70">
              <p className="font-medium">No classes on {DAY_FULL[selectedDay]}.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {byDay[selectedDay].map((item) => {
                const todaySession = selectedDay === todayDow
                  ? todayMap.get(sessionKey(item.className, item.startTime, item.endTime))
                  : undefined;
                const cardBg  = todaySession ? (statusBg[todaySession.status] ?? "border-l-gray-300 bg-card") : "border-l-[#273C97] bg-card";
                const cardTxt = todaySession ? (statusText[todaySession.status] ?? "text-muted-foreground") : "";

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border border-border/50 border-l-4 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${cardBg} ${!item.status ? "opacity-50" : ""}`}
                  >
                    <div className="shrink-0 w-28 text-center bg-white/70 rounded-lg py-2 px-3 border border-border/50">
                      <p className="text-base font-bold text-foreground">{item.startTime?.slice(0, 5)}</p>
                      <p className="text-sm text-muted-foreground/70">–</p>
                      <p className="text-base font-bold text-foreground">{item.endTime?.slice(0, 5)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground">{scheduleTitle()}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.className}</p>
                      {role === "ADMIN" && (
                        <p className="mt-0.5 text-sm text-muted-foreground/70">{item.teacherName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-muted text-muted-foreground hover:bg-muted text-xs">Slot {item.slot}</Badge>
                      {!item.status && (
                        <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 text-xs">Off</Badge>
                      )}
                      {todaySession && (
                        <Badge className={`text-xs ${statusText[todaySession.status] ?? ""} ${
                          todaySession.status === "ACTIVE" ? "bg-green-100" :
                          (todaySession.status === "SCHEDULED" || todaySession.status === "UPCOMING") ? "bg-blue-100" :
                          todaySession.status === "CANCELLED" ? "bg-red-100" : "bg-muted"
                        } hover:bg-opacity-100`}>
                          {todaySession.status}
                        </Badge>
                      )}
                      {todaySession && (todaySession.status === "SCHEDULED" || todaySession.status === "UPCOMING" || todaySession.status === "ACTIVE") && (
                        <Link href={`/sessions/${todaySession.id}`}>
                          <Button size="sm" className="h-7 gap-1 bg-primary px-2 text-sm hover:bg-primary/90">
                            <QrCodeIcon className="size-3" />
                            QR
                          </Button>
                        </Link>
                      )}
                      {isAdmin && (
                        <ScheduleRowActions schedule={item} classrooms={classroomOptions} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3 min-h-[400px]">
          {DAYS.map((day) => {
            const isToday = day === todayDow;
            const items   = byDay[day];

            return (
              <div key={day} className="flex flex-col">
                <Link href={`/schedule?day=${day}`} className="block mb-3">
                  <div className={`text-center py-2 px-1 rounded-xl transition-opacity hover:opacity-80 cursor-pointer ${
                    isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-gray-200"
                  }`}>
                    <p className={`text-sm font-semibold uppercase tracking-wider ${isToday ? "text-white/70" : "text-muted-foreground/70"}`}>
                      <span className="hidden md:inline">{DAY_FULL[day]}</span>
                      <span className="md:hidden">{DAY_SHORT[day]}</span>
                    </p>
                    {isToday && <p className="mt-0.5 text-xs text-white/60">Today</p>}
                  </div>
                </Link>
                <div className="flex flex-col gap-2 flex-1">
                  {items.length === 0 ? (
                    <div className={`flex-1 rounded-xl border border-dashed flex items-center justify-center min-h-[80px] ${
                      isToday ? "border-primary/30 bg-primary/5" : "border-border"
                    }`}>
                      <span className="text-sm text-muted-foreground/40">Free</span>
                    </div>
                  ) : (
                    items.map((item) => {
                      const todaySession = isToday
                        ? todayMap.get(sessionKey(item.className, item.startTime, item.endTime))
                        : undefined;
                      const cardBg  = todaySession ? (statusBg[todaySession.status] ?? "border-l-gray-300 bg-card") : "border-l-gray-300 bg-card";
                      const cardTxt = todaySession ? (statusText[todaySession.status] ?? "text-muted-foreground") : "";

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border border-border/50 border-l-4 p-3 flex flex-col gap-1.5 ${cardBg} ${!item.status ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="line-clamp-2 text-sm font-bold leading-tight text-foreground">{scheduleTitle()}</p>
                            {isAdmin && (
                              <ScheduleRowActions schedule={item} classrooms={classroomOptions} />
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{item.className}</p>
                          {role === "ADMIN" && (
                            <p className="truncate text-xs text-muted-foreground/70">{item.teacherName}</p>
                          )}
                          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                            {item.startTime?.slice(0, 5)} – {item.endTime?.slice(0, 5)}
                          </p>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <Badge className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground hover:bg-muted">Slot {item.slot}</Badge>
                            {!item.status && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-orange-100 text-orange-600 hover:bg-orange-100">Off</Badge>
                            )}
                          </div>
                          {todaySession && (
                            <div className="mt-1 pt-1.5 border-t border-border/50 flex items-center justify-between gap-1">
                              <span className={`text-[10px] font-semibold ${cardTxt}`}>{todaySession.status}</span>
                              {(todaySession.status === "SCHEDULED" || todaySession.status === "UPCOMING" || todaySession.status === "ACTIVE") && (
                                <Link href={`/sessions/${todaySession.id}`}>
                                  <Button size="sm" className="h-5 px-1.5 text-[10px] bg-primary hover:bg-primary/90 gap-1">
                                    <QrCodeIcon className="size-2.5" />
                                    QR
                                  </Button>
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
