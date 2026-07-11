"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { TbMenuDeep } from "react-icons/tb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MyDropdownMenuCheckboxes() {
  const pathname = usePathname();
  const isActiveClass = pathname.startsWith("/dashboard/classrooms");
  const isHistoryClass = pathname.startsWith("/dashboard/history-class");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex justify-center items-center py-3 px-3 bg-accent border-primary rounded-xl text-sm font-medium text-foreground hover:text-primary transition-colors"
          aria-label="Class menu"
        >
          <TbMenuDeep className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/classrooms" className="justify-between">
              <span>Active Class</span>
              {isActiveClass ? <CheckIcon className="size-4" /> : null}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/history-class" className="justify-between">
              <span>History</span>
              {isHistoryClass ? <CheckIcon className="size-4" /> : null}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
