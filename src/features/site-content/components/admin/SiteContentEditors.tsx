"use client";

import { ClassesEditor } from "./ClassesEditor";
import { ContactEditor } from "./ContactEditor";
import { EditableLoader } from "./EditableLoader";
import { LegalEditor } from "./LegalEditor";
import { NoticeEditor } from "./NoticeEditor";
import { TuitionEditor } from "./TuitionEditor";

/** 랜딩에 보이는 내용의 편집 카드들이에요. */
export function SiteContentEditors() {
  return (
    <EditableLoader>
      {(e) => (
        <div className="flex min-w-0 flex-col gap-4">
          <NoticeEditor initial={e.notice} />
          <ClassesEditor initial={e.classes} />
          <TuitionEditor initial={e.tuition} />
          <ContactEditor initial={e.contact} />
          <LegalEditor initial={e.legal} />
        </div>
      )}
    </EditableLoader>
  );
}
