"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export type ReportAttendanceRow = {
  order: number;
  id: string;
  profile: string;
  name: string;
  gender: string;
  p: number | string;
  pm: number | string;
  l: number | string;
  status: string;
  permissionReason?: string;
  lateReason?: string;
  nameTone?: "normal" | "warning" | "danger";
  isAlertRow?: boolean;
};

export const reportColumns: ColumnDef<ReportAttendanceRow>[] = [
  {
    accessorKey: "order",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className={row.original.isAlertRow ? "text-[#ff0000]" : "text-black"}>
        {row.original.order}
      </span>
    ),
  },
  {
    accessorKey: "id",
    header: "Id",
    cell: ({ row }) => (
      <span className={row.original.isAlertRow ? "text-[#ff0000]" : "text-black"}>
        {row.original.id}
      </span>
    ),
  },
  {
    accessorKey: "profile",
    header: "Profile",
    cell: ({ row, table }) => {
      const profileBasePath = table.options.meta?.studentProfileBasePath;
      const profileHref = profileBasePath
        ? `${profileBasePath}/${row.original.id}`
        : `/students/${row.original.id}`;

      return (
        <Link href={profileHref} aria-label={`View ${row.original.name} profile`}>
          <Image
            width={50}
            height={50}
            src={row.original.profile}
            alt={`${row.original.name} profile`}
            className="h-12 w-12 rounded-xl object-cover"
          />
        </Link>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      if (row.original.isAlertRow) {
        return <span className="text-[#ff0000]">{row.original.name}</span>;
      }
      const tone = row.original.nameTone ?? "normal";
      const toneClass =
        tone === "warning"
          ? "text-amber-500"
          : tone === "danger"
            ? "text-red-500"
            : "text-black";
      return <span className={toneClass}>{row.original.name}</span>;
    },
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    accessorKey: "p",
    header: () => <div className="w-6 text-center">P</div>,
    cell: ({ row }) => <div className="w-6 text-center">{row.original.p}</div>,
  },
  {
    accessorKey: "pm",
    header: () => <div className="w-6 text-center">PM</div>,
    cell: ({ row }) => <div className="w-6 text-center">{row.original.pm}</div>,
  },
  {
    accessorKey: "l",
    header: () => <div className="w-6 text-center">L</div>,
    cell: ({ row }) => <div className="w-6 text-center">{row.original.l}</div>,
  },
  {
    accessorKey: "status",
    header: () => <div className="text-center">Status</div>,
    cell: ({ row, table }) => {
      const rowId = row.original.id;
      const hasDetails =
        !!row.original.permissionReason || !!row.original.lateReason;
      const isExpanded = table.options.meta?.expandedRowId === rowId;

      if (!hasDetails) {
        return <div className="text-center text-sm text-[#1f1f1f]">active</div>;
      }

      return (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => table.options.meta?.toggleExpandedRow?.(rowId)}
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-black transition hover:bg-gray-100"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      );
    },
  },
];
