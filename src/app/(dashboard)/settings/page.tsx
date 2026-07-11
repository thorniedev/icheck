"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BellIcon,
  CalendarDaysIcon,
  ClockIcon,
  LoaderCircleIcon,
  MapPinIcon,
  MinusIcon,
  NetworkIcon,
  PlusIcon,
  QrCodeIcon,
  SaveIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ThermometerSnowflake,
} from "lucide-react";
import { FreezeClassDialog } from "@/components/freeze-class-dialog";
import {
  useGetSettingsQuery,
  useUpdateSettingMutation,
  type SettingDto,
} from "@/store/api/attendanceApi";
import {
  IpAllowlistCard,
  SchoolLocationCard,
  NETWORK_LOCATION_KEYS,
} from "@/components/settings/network-location-settings";

const KEY_LABELS: Record<string, string> = {
  early_checkin_minutes: "Early check-in window",
  late_threshold_minutes: "Late threshold",
  student_attendance_cutoff_minutes: "Student attendance cut-off",
  teacher_edit_deadline_minutes: "Teacher correction deadline",
  qr_expire_minutes: "QR code expiry",
  gps_allowed_radius_meters: "GPS allowed radius",
  attendance_reminder_enabled: "Attendance reminder",
  ip_validation_enabled: "IP validation",
  school_ip_cidrs: "School IP ranges",
  attendance_weight: "Attendance weight",
  late_penalty: "Late / early-out penalty",
  absent_penalty: "Absent penalty",
  min_attendance_required: "Minimum attendance required",
};

const KEY_HELP: Record<string, string> = {
  early_checkin_minutes: "How early students can check in before a session starts.",
  late_threshold_minutes: "Minutes after session start before attendance becomes late.",
  student_attendance_cutoff_minutes: "Latest time students can still submit attendance.",
  teacher_edit_deadline_minutes: "How long teachers can correct attendance after class.",
  qr_expire_minutes: "How long the QR stays valid after the session starts.",
  gps_allowed_radius_meters: "Allowed distance from the school location.",
  attendance_reminder_enabled: "Enable or disable attendance reminders.",
  ip_validation_enabled: "Require check-ins to come from school IP ranges.",
  school_ip_cidrs: "Comma-separated school network ranges.",
  attendance_weight: "Maximum attendance score points. 10 means attendance is worth 10% of a 100-point course score.",
  late_penalty: "Points removed for each late or early-out attendance record.",
  absent_penalty: "Points removed for each absence.",
  min_attendance_required: "Minimum attendance percentage required for exam eligibility.",
};

const ATTENDANCE_POLICY_KEYS = [
  "attendance_weight",
  "late_penalty",
  "absent_penalty",
  "min_attendance_required",
];

const OBSOLETE_SETTING_KEYS = [
  "qr_expire_seconds",
  "qr_window_minutes",
  "max_sessions_per_day",
];

function humanizeKey(key: string) {
  return KEY_LABELS[key] ?? key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function unitForSetting(key: string) {
  if (key === "attendance_weight" || key === "min_attendance_required") return "%";
  if (key.endsWith("_penalty")) return "points";
  if (key.includes("minutes")) return "minutes";
  if (key.includes("seconds")) return "seconds";
  if (key.includes("meters")) return "meters";
  if (key.includes("per_day")) return "per day";
  return "";
}

function stepForSetting(key: string) {
  if (key.endsWith("_penalty")) return 0.5;
  if (key.includes("seconds")) return 30;
  return 1;
}

function isNumberSetting(setting: SettingDto) {
  const type = setting.type.toUpperCase();
  return (
    type === "INT" ||
    ATTENDANCE_POLICY_KEYS.includes(setting.settingKey) ||
    setting.settingKey.includes("minutes") ||
    setting.settingKey.includes("seconds") ||
    setting.settingKey.includes("meters") ||
    setting.settingKey.includes("per_day")
  );
}

function settingGroup(key: string) {
  if (ATTENDANCE_POLICY_KEYS.includes(key)) {
    return "Attendance Policy";
  }
  if (key.includes("minutes") || key.includes("seconds") || key.includes("sessions")) {
    return "Session Timing";
  }
  if (key.includes("gps") || key.includes("ip") || key.includes("cidrs")) {
    return "Check-in Rules";
  }
  return "General Options";
}

function SettingIcon({ settingKey }: { settingKey: string }) {
  if (ATTENDANCE_POLICY_KEYS.includes(settingKey)) return <ShieldCheckIcon className="size-5" />;
  if (settingKey === "late_threshold_minutes") return <ClockIcon className="size-5" />;
  if (settingKey.includes("qr")) return <QrCodeIcon className="size-5" />;
  if (settingKey.includes("gps")) return <MapPinIcon className="size-5" />;
  if (settingKey.includes("ip") || settingKey.includes("cidrs"))
    return <NetworkIcon className="size-5" />;
  if (settingKey.includes("reminder")) return <BellIcon className="size-5" />;
  if (settingKey.includes("sessions")) return <CalendarDaysIcon className="size-5" />;
  return <ShieldCheckIcon className="size-5" />;
}

function formatUpdated(date: string | null) {
  if (!date) return "Not updated";
  return new Date(date).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SettingOptionCard({
  setting,
  onSave,
}: {
  setting: SettingDto;
  onSave: (setting: SettingDto, value: string) => Promise<void>;
}) {
  const [draftValue, setDraftValue] = useState(setting.settingValue);
  const [saving, setSaving] = useState(false);
  const isBoolean = setting.type.toUpperCase() === "BOOLEAN";
  const isNumeric = isNumberSetting(setting);
  const unit = unitForSetting(setting.settingKey);
  const changed = draftValue.trim() !== setting.settingValue;

  async function save() {
    if (!draftValue.trim() || !changed) return;
    setSaving(true);
    try {
      await onSave(setting, draftValue.trim());
    } finally {
      setSaving(false);
    }
  }

  function nudge(delta: number) {
    const current = Number.parseFloat(draftValue || "0");
    const next = Number.isFinite(current) ? Math.max(0, current + delta) : 0;
    setDraftValue(Number.isInteger(next) ? String(next) : next.toFixed(2).replace(/\.?0+$/, ""));
  }

  return (
    <Card className="min-h-56 rounded-lg">
      <CardHeader className="gap-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SettingIcon settingKey={setting.settingKey} />
        </div>
        <CardTitle>{humanizeKey(setting.settingKey)}</CardTitle>
        <CardDescription>
          {setting.description || KEY_HELP[setting.settingKey] || "System option."}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto space-y-4">
        {isBoolean ? (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={draftValue === "true" ? "default" : "ghost"}
              className={draftValue === "true" ? "bg-green-600 text-white hover:bg-green-700" : ""}
              onClick={() => setDraftValue("true")}
            >
              Enabled
            </Button>
            <Button
              type="button"
              variant={draftValue === "false" ? "default" : "ghost"}
              className={draftValue === "false" ? "bg-muted-foreground text-background hover:bg-muted-foreground/80" : ""}
              onClick={() => setDraftValue("false")}
            >
              Disabled
            </Button>
          </div>
        ) : isNumeric ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => nudge(-stepForSetting(setting.settingKey))}
            >
              <MinusIcon className="size-4" />
            </Button>
            <div className="relative flex-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={stepForSetting(setting.settingKey)}
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="h-12 pr-20 text-center text-2xl font-semibold tabular-nums"
              />
              {unit && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => nudge(stepForSetting(setting.settingKey))}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <Input
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            className="h-12 font-mono"
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/70">
            Updated {formatUpdated(setting.updatedAt)}
          </p>
          <Button
            type="button"
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={save}
            disabled={!changed || saving || !draftValue.trim()}
          >
            {saving
              ? <LoaderCircleIcon className="size-4 animate-spin" />
              : <SaveIcon className="size-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: settings = [], isLoading, isError, error } = useGetSettingsQuery();
  const [updateSetting] = useUpdateSettingMutation();

  const visibleSettings = useMemo(() => {
    return settings.filter((setting) => !OBSOLETE_SETTING_KEYS.includes(setting.settingKey));
  }, [settings]);

  const groupedSettings = useMemo(() => {
    return visibleSettings
      .filter((setting) => !NETWORK_LOCATION_KEYS.includes(setting.settingKey))
      .reduce<Record<string, SettingDto[]>>((groups, setting) => {
        const group = settingGroup(setting.settingKey);
        groups[group] = [...(groups[group] ?? []), setting];
        return groups;
      }, {});
  }, [visibleSettings]);

  async function updateSettingValue(setting: SettingDto, value: string) {
    try {
      await updateSetting({ key: setting.settingKey, value }).unwrap();
      toast.success(`${humanizeKey(setting.settingKey)} updated.`);
    } catch {
      toast.error("Update failed.");
    }
  }

  return (
    <div className="px-4 sm:px-5 py-6 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings2Icon className="size-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">System Settings</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tune attendance rules. Settings are managed by the API and can only be updated here.
          </p>
        </div>
      </div>

      {isError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          Failed to load settings{error && "status" in error ? ` - HTTP ${error.status}` : ""}.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoaderCircleIcon className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <section className="mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Location &amp; Network</h2>
            <Badge variant="outline">2 options</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <IpAllowlistCard settings={settings} />
            <SchoolLocationCard settings={settings} />
          </div>

          {/* Freeze attendance for a date range — whole school. Per-class
              freeze lives on each class detail page. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThermometerSnowflake className="size-5 text-sky-600" />
                Freeze Attendance (whole school)
              </CardTitle>
              <CardDescription>
                Pause attendance for one or more days across every class. useful for
                a public holiday or exam week. No sessions are generated and
                check-ins are rejected on those days. To freeze just one class,
                use the Freeze button on that class&apos;s page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FreezeClassDialog />
            </CardContent>
          </Card>
        </section>
      )}

      {isLoading ? null : visibleSettings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-20 text-center text-muted-foreground/70">
          <Settings2Icon className="mx-auto mb-3 size-10 opacity-40" />
          <p className="font-medium">No settings returned by the API.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSettings).map(([group, groupSettings]) => (
            <section key={group} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{group}</h2>
                <Badge variant="outline">{groupSettings.length} options</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {groupSettings.map((setting) => (
                  <SettingOptionCard
                    key={`${setting.id}-${setting.settingValue}`}
                    setting={setting}
                    onSave={updateSettingValue}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
