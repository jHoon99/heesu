import type { ElementType } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../cn";

export type StudentTabItem = {
  value: string;
  label: string;
  href: string;
  icon: LucideIcon;
  dot?: boolean;
};

export interface StudentTabBarProps {
  items: StudentTabItem[];
  active?: string;
  linkComponent?: ElementType;
  className?: string;
}

const MAX_TABS = 5;

export function StudentTabBar({
  items,
  active,
  linkComponent: Link = "a",
  className,
}: StudentTabBarProps) {
  return (
    <nav
      aria-label="학생 메뉴"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-surface pb-[env(safe-area-inset-bottom)] shadow-sm",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-[480px]">
        {items.slice(0, MAX_TABS).map((item) => {
          const Icon = item.icon;
          const isActive = item.value === active;
          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-caption transition-colors duration-(--dur-instant) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
                isActive ? "font-semibold text-text-brand" : "text-text-muted",
              )}
            >
              <span className="relative">
                <Icon size={24} aria-hidden="true" />
                {item.dot ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-1 size-2 rounded-full bg-danger-500"
                    />
                    <span className="sr-only">, 새 소식</span>
                  </>
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
