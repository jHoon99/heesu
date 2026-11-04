"use client";

import { Modal } from "@/design-system";
import { ClassesEditor } from "./ClassesEditor";
import { ContactEditor } from "./ContactEditor";
import { EditableLoader } from "./EditableLoader";
import { LegalEditor } from "./LegalEditor";
import { NoticeEditor } from "./NoticeEditor";
import { TuitionEditor } from "./TuitionEditor";

/** 홈페이지 관리에서 누를 수 있는 부분이에요. */
export type LandingSection =
  "notice" | "classes" | "tuition" | "contact" | "footer";

const TITLES: Record<LandingSection, string> = {
  notice: "공지 고치기",
  classes: "반·시간표 고치기",
  tuition: "수강료 고치기",
  contact: "주소·전화번호 고치기",
  footer: "학원 정보 고치기",
};

const WIDTHS: Record<LandingSection, number> = {
  notice: 520,
  classes: 680,
  tuition: 520,
  contact: 520,
  footer: 560,
};

/** 누른 부분의 편집 칸을 창으로 띄워요. 열 때마다 저장된 값을 새로 읽고, 저장하면 닫혀요. */
export function LandingEditModal({
  section,
  onClose,
}: {
  section: LandingSection | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={section !== null}
      title={section ? TITLES[section] : ""}
      width={section ? WIDTHS[section] : 520}
      onClose={onClose}
    >
      {section ? (
        <div className="pb-1 text-text">
          <EditableLoader>
            {(e) => {
              switch (section) {
                case "notice":
                  return (
                    <NoticeEditor bare initial={e.notice} onSaved={onClose} />
                  );
                case "classes":
                  return (
                    <ClassesEditor bare initial={e.classes} onSaved={onClose} />
                  );
                case "tuition":
                  return (
                    <TuitionEditor bare initial={e.tuition} onSaved={onClose} />
                  );
                case "contact":
                  return (
                    <ContactEditor bare initial={e.contact} onSaved={onClose} />
                  );
                case "footer":
                  // 맨 아래 학원 정보에는 법정 표시와 주소·전화가 같이 보여요. 각각 따로 저장해요.
                  return (
                    <div className="flex flex-col gap-6">
                      <section className="flex flex-col gap-3">
                        <h3 className="text-label text-text">법정 표시</h3>
                        <LegalEditor bare initial={e.legal} />
                      </section>
                      <section className="flex flex-col gap-3 border-t border-border pt-5">
                        <h3 className="text-label text-text">주소·전화번호</h3>
                        <ContactEditor bare initial={e.contact} />
                      </section>
                    </div>
                  );
              }
            }}
          </EditableLoader>
        </div>
      ) : null}
    </Modal>
  );
}
