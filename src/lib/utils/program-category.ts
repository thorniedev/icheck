/**
 * The 3 top-level program categories used across every filter (Classes,
 * Students, Reports). Granular program types are grouped into these:
 *   - HIGHER_DEGREE — single (no sub-programs)
 *   - BACHELOR      — includes Associate
 *   - SCHOLARSHIP   — the course programs (ITE, ITP, Fullstack, Foundation, Pre-Uni…)
 *
 * Selecting a category narrows the downstream filters: Scholarship reveals the
 * Course list; Bachelor / Higher Degree reveal Year + Semester.
 */
export type ProgramCategory = "HIGHER_DEGREE" | "BACHELOR" | "SCHOLARSHIP";

export const PROGRAM_CATEGORIES: { value: ProgramCategory; label: string }[] = [
  { value: "HIGHER_DEGREE", label: "Higher Degree" },
  { value: "BACHELOR", label: "Bachelor" },
  { value: "SCHOLARSHIP", label: "Scholarship" },
];

export const PROGRAM_CATEGORY_LABEL: Record<ProgramCategory, string> = {
  HIGHER_DEGREE: "Higher Degree",
  BACHELOR: "Bachelor",
  SCHOLARSHIP: "Scholarship",
};

/** Scholarship sub-programs ("courses"), derived from the class name. */
export const SCHOLARSHIP_COURSES = ["Fullstack", "Foundation", "Pre-Uni", "ITP", "ITE"];

/** Map a granular program-type name to one of the 3 categories. */
export function programCategoryOf(programTypeName: string | null | undefined): ProgramCategory {
  const n = (programTypeName ?? "").toLowerCase();
  if (n.includes("higher")) return "HIGHER_DEGREE";
  if (n.includes("bachelor") || n.includes("associate")) return "BACHELOR";
  return "SCHOLARSHIP";
}

/** The Scholarship course encoded in a class name (e.g. "ITE Gen3" → "ITE"), or null. */
export function scholarshipCourseOf(className: string | null | undefined): string | null {
  const name = (className ?? "").toLowerCase();
  return SCHOLARSHIP_COURSES.find((c) => name.includes(c.toLowerCase())) ?? null;
}

/** Degree categories use Year + Semester structure; Scholarship does not. */
export function isSemesterCategory(category: ProgramCategory): boolean {
  return category === "BACHELOR" || category === "HIGHER_DEGREE";
}
