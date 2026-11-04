import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-semibold tracking-[0.16em] text-text-brand">
        {eyebrow}
      </span>
      <h2 className="font-serif text-heading-serif md:text-[30px] md:leading-[40px]">
        {title}
      </h2>
      {children}
    </div>
  );
}
