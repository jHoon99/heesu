import type { ElementType } from "react";
import { LogOut, type LucideIcon } from "lucide-react";
import { cn } from "../../cn";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";

export type AdminSidebarItem = {
  value: string;
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number;
};

export interface AdminSidebarProps {
  items: ({ group: string } | AdminSidebarItem)[];
  active?: string;
  linkComponent?: ElementType;
  logoSrc?: string;
  academyName?: string;
  userName?: string;
  userRole?: string;
  onSignOut?: () => void;
}

export function AdminSidebar({
  items,
  active,
  linkComponent: Link = "a",
  logoSrc = "/brand/heesu-mark.svg",
  academyName = "희수영어",
  userName,
  userRole = "원장",
  onSignOut,
}: AdminSidebarProps) {
  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r border-border bg-bg-surface-raised lg:w-(--sidebar)">
      <div className="flex h-16 items-center gap-3 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" className="size-8 shrink-0" />
        <span className="font-serif text-h3 text-text max-lg:sr-only">
          {academyName}
        </span>
      </div>

      <nav aria-label="관리 메뉴" className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            if ("group" in item) {
              return (
                <li
                  key={`group-${item.group}`}
                  className="px-3 pt-4 pb-1 text-caption text-text-subtle max-lg:sr-only"
                >
                  {item.group}
                </li>
              );
            }
            const Icon = item.icon;
            const isActive = item.value === active;
            return (
              <li key={item.value}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-label transition-colors duration-(--dur-instant)",
                    isActive
                      ? "bg-primary-soft text-text-brand"
                      : "text-text-muted hover:bg-bg-subtle",
                  )}
                >
                  <Icon size={20} aria-hidden="true" className="shrink-0" />
                  <span className="max-lg:sr-only">{item.label}</span>
                  {item.count !== undefined ? (
                    <>
                      {" "}
                      <Badge tone="count" className="ml-auto max-lg:sr-only">
                        {item.count}
                        <span className="sr-only">건</span>
                      </Badge>
                    </>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        {userName ? (
          <div className="flex flex-col px-1 max-lg:sr-only">
            <span className="text-label text-text">{userName}</span>
            <span className="text-caption text-text-subtle">{userRole}</span>
          </div>
        ) : null}
        {onSignOut ? (
          <Button
            variant="ghost"
            size="md"
            icon={LogOut}
            onClick={onSignOut}
            className="max-lg:px-0"
          >
            <span className="max-lg:sr-only">로그아웃</span>
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
