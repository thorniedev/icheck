import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Pencil, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { backendFetch } from "@/lib/api-fetch";

type StudentProfilePanelProps = {
  classroomId: string;
  studentId: string;
  mode?: "page" | "modal";
};

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  profileImage: string;
}

async function fetchStudent(studentId: string): Promise<StudentProfile | null> {
  try {
    const res = await backendFetch(`/users/students/${encodeURIComponent(studentId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    const student = json?.payload ?? json;
    if (!student || typeof student !== "object") return null;

    return {
      id: String(student.id ?? student.studentNo ?? studentId),
      name: String(student.name ?? student.fullName ?? student.username ?? "—"),
      email: String(student.email ?? "—"),
      gender: String(student.gender ?? "—"),
      dateOfBirth: String(student.dateOfBirth ?? student.dob ?? "—"),
      phone: String(student.phone ?? student.phoneNumber ?? "—"),
      profileImage: String(student.profileImage ?? student.profile ?? "/file.svg"),
    };
  } catch {
    return null;
  }
}

export async function StudentProfilePanel({
  classroomId,
  studentId,
  mode = "page",
}: StudentProfilePanelProps) {
  const student = await fetchStudent(decodeURIComponent(studentId));

  if (!student) {
    notFound();
  }

  const information: ProfileFieldProps[] = [
    { label: "Student ID", value: student.id, wide: true },
    { label: "Full Name (English)", value: student.name },
    { label: "Full Name (Khmer)", value: "N/A" },
    { label: "Gender", value: student.gender },
    { label: "Birth Of Date", value: student.dateOfBirth },
    { label: "Nationality", value: "Khmer" },
    { label: "Ethnicity", value: "None" },
    { label: "Telephone", value: student.phone },
  ];

  const profileAside = (
    <aside className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <div className="relative size-24 overflow-hidden rounded-full border-[1.5px] border-zinc-400 bg-zinc-300 shadow-inner">
        <Image
          src={student.profileImage}
          alt={student.name}
          width={96}
          height={96}
          className="size-full object-cover"
        />
      </div>

      <div className="mt-5 space-y-1 text-base leading-6 dark:text-white text-zinc-900">
        <p>
          <span className="font-semibold">Username:</span>{" "}
          <span className="text-light">{student.name}</span>
        </p>
        <p>
          <span className="font-semibold">email: </span>{" "}
          <span className="font-light">{student.email}</span>
        </p>
      </div>
    </aside>
  );

  const profileSummary = (
    <div className="flex shrink-0 flex-col items-center text-center sm:w-44 sm:items-start sm:text-left">
      {/* left part */}
      <div className="relative size-24 overflow-hidden rounded-full border-[1.5px] border-zinc-400 bg-zinc-300 shadow-inner">
        <Image
          src={student.profileImage}
          alt={student.name}
          width={96}
          height={96}
          className="size-full object-cover"
        />
      </div>
      <div className="mt-5 w-62.5 space-y-1 text-base leading-6 text-zinc-900">
        <p>
          <span className="font-semibold">Username:</span>{" "}
          <span className="font-light">{student.name}</span>
        </p>
        <p>
          <span className="font-semibold">Email: </span>{" "}
          <span className="font-light">{student.email}</span>
        </p>
      </div>
    </div>
  );

  const informationList = (
    <dl className="grid flex-1 gap-y-4 sm:grid-cols-2">
      {information.map((item) => (
        <ProfileField
          key={item.label}
          {...item}
          wide={mode === "page" ? item.wide : false}
        />
      ))}
    </dl>
  );

  const informationCard = (
    <Card className="relative rounded-lg border-zinc-300  py-0 shadow-sm">
      {mode === "modal" && (
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="absolute right-4 top-4 z-10 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Link
            href={`/dashboard/classrooms/${classroomId}`}
            aria-label="Close student profile"
          >
            <X className="size-4" />
          </Link>
        </Button>
      )}

      <CardContent
        className={
          mode === "modal"
            ? "py-8 pl-20 pr-14 md:py-10"
            : "px-8 md:px-12 md:py-9"
        }
      >
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-white">
            Personal Information
          </h1>

          {mode === "page" && (
            <Button
              type="button"
              className="h-7 rounded-full bg-red-500 px-3 text-sm font-bold text-white hover:bg-red-600"
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </div>

        {mode === "modal" ? (
          <div className="mx-auto grid max-w-2xl gap-1 sm:grid-cols-[276px_minmax(0,1fr)] sm:items-start">
            <div className="">
              {profileSummary}
            </div>
            {informationList}
          </div>
        ) : (
          informationList
        )}
      </CardContent>
    </Card>
  );

  if (mode === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-4">
        <section className="w-full max-w-3xl">{informationCard}</section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-2">
      <div className="flex justify-between items-center ">
        <h1 className="text-xl font-bold">Profile</h1>
        <Button
          variant="ghost"
          asChild
          className="mb-7 h-9 rounded-full border border-transparent px-4 text-sm font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-white/70"
        >
          <Link className="dark:text-white" href={`/dashboard/classrooms/${classroomId}`}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      </div>
      <section className="mx-auto grid w-full max-w-5xl gap-10 md:px-10 lg:grid-cols-[260px_minmax(480px,1fr)] lg:items-start xl:gap-10">
        {profileAside}
        {informationCard}
      </section>
    </div>
  );
}

type ProfileFieldProps = {
  label: string;
  value: string;
  wide?: boolean;
};

function ProfileField({ label, value, wide }: ProfileFieldProps) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold capitalize text-zinc-950 dark:text-white">
        {value}
      </dd>
    </div>
  );
}
