"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ChevronsUpDownIcon,
  UserIcon,
  BellIcon,
  LogOutIcon,
  CameraIcon,
  LoaderCircleIcon,
} from "lucide-react"
import { useUpdateUser, useUser } from "@/components/user-provider"
import { LOGOUT_URL } from "@/lib/api-config"

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function handleLogout() {
  window.location.assign(LOGOUT_URL);
}

function pickProfileImage(value: unknown): string | null {
  if (!value || typeof value !== "object") return typeof value === "string" ? value : null;
  const root = value as Record<string, unknown>;
  const payload = root.payload;
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const nested = payload as Record<string, unknown>;
    const image = nested.profileImage ?? nested.url ?? nested.imageUrl;
    return typeof image === "string" ? image : null;
  }
  const image = root.profileImage ?? root.url ?? root.imageUrl;
  return typeof image === "string" ? image : null;
}

export function NavUser({
  user: serverUser,
}: {
  user: { name: string; email: string; role: string; displayRole?: string; profileImage?: string | null }
}) {
  const { isMobile } = useSidebar()
  
  const liveUser = useUser()
  const updateUser = useUpdateUser()
  const user = liveUser ?? serverUser
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const displayRole =
    "displayRole" in user && user.displayRole
      ? user.displayRole
      : user.role === "ADMIN"
        ? "Admin"
        : user.role === "TEACHER"
          ? "Teacher"
          : user.role === "STUDENT"
            ? "Student"
            : user.role

  const avatarBg = "bg-primary"

  const uploadProfileImage = async (file: File | undefined) => {
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/auth/profile-image", {
        method: "PUT",
        body: formData,
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message ?? json?.error ?? `Upload failed (${res.status}).`);
      }

      const nextImage = pickProfileImage(json);
      if (nextImage) {
        updateUser?.({ profileImage: nextImage });
      }
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload profile photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const imageUrl = "profileImage" in user ? user.profileImage : null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void uploadProfileImage(event.target.files?.[0])}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8">
                {imageUrl ? <AvatarImage src={imageUrl} alt={user.name || "Profile"} /> : null}
                <AvatarFallback className={`${avatarBg} text-white text-xs font-semibold`}>
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name || "—"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {displayRole}{user.email ? ` · ${user.email}` : ""}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Profile header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3 text-left text-sm">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    {imageUrl ? <AvatarImage src={imageUrl} alt={user.name || "Profile"} /> : null}
                    <AvatarFallback className={`${avatarBg} text-white text-sm font-semibold`}>
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute -right-1 -bottom-1 inline-flex size-7 items-center justify-center rounded-full border-2 border-card bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground disabled:cursor-wait disabled:opacity-70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                    aria-label="Upload profile photo"
                  >
                    {uploading ? (
                      <LoaderCircleIcon className="size-3.5 animate-spin" />
                    ) : (
                      <CameraIcon className="size-3.5" />
                    )}
                  </button>
                </div>
                <div className="grid flex-1 text-left leading-tight gap-0.5">
                  <span className="font-semibold text-foreground">{user.name || "—"}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email || "—"}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {displayRole}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Menu items */}
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-3 py-2.5"
                onSelect={(event) => event.preventDefault()}
              >
                <UserIcon className="size-4 text-muted-foreground" />
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 py-2.5">
                <BellIcon className="size-4 text-muted-foreground" />
                <span>Notifications</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Log out */}
            <DropdownMenuItem
              className="gap-3 py-2.5 text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/30"
              onClick={handleLogout}
            >
              <LogOutIcon className="size-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
