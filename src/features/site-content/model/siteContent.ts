import { z } from "zod";

export type Notice = { title: string; body: string };
export type ClassInfo = {
  name: string;
  grades: string | null;
  schedule: string | null;
  capacity: number | null;
};
export type Tuition = { monthly: string | null; textbook: string | null; note: string | null };
export type Contact = { phone: string | null; address: string | null };
export type Legal = {
  academyName: string | null;
  registrationNo: string | null;
  subjects: string | null;
  tuitionNotice: string | null;
};
export type SiteContent = {
  notice: Notice | null;
  classes: ClassInfo[];
  tuition: Tuition;
  contact: Contact;
  legal: Legal;
};

export const EMPTY_SITE_CONTENT: SiteContent = {
  notice: null,
  classes: [],
  tuition: { monthly: null, textbook: null, note: null },
  contact: { phone: null, address: null },
  legal: { academyName: null, registrationNo: null, subjects: null, tuitionNotice: null },
};

// Trimmed non-empty string, otherwise null. Never throws.
const text = z.unknown().optional().transform((v) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
});

const capacity = z.unknown().optional().transform((v) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null));

const noticeSchema = z
  .object({ title: text, body: text, visible: z.unknown().optional() })
  .transform((v): Notice | null =>
    v.visible === false || v.title === null ? null : { title: v.title, body: v.body ?? "" },
  );

const classItemSchema = z
  .object({ name: text, grades: text, schedule: text, capacity })
  .transform((v): ClassInfo | null => (v.name === null ? null : { ...v, name: v.name }));

const tuitionSchema = z.object({ monthly: text, textbook: text, note: text });
const contactSchema = z.object({ phone: text, address: text });
const legalSchema = z
  .object({ academy_name: text, registration_no: text, subjects: text, tuition_notice: text })
  .transform(
    (v): Legal => ({
      academyName: v.academy_name,
      registrationNo: v.registration_no,
      subjects: v.subjects,
      tuitionNotice: v.tuition_notice,
    }),
  );

function parseClasses(value: unknown): ClassInfo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = classItemSchema.safeParse(item);
    return parsed.success && parsed.data ? [parsed.data] : [];
  });
}

export function parseSiteContent(rows: { key: string; value: unknown }[]): SiteContent {
  const result: SiteContent = { ...EMPTY_SITE_CONTENT };
  for (const { key, value } of rows) {
    switch (key) {
      case "notice": {
        const p = noticeSchema.safeParse(value);
        result.notice = p.success ? p.data : null;
        break;
      }
      case "classes":
        result.classes = parseClasses(value);
        break;
      case "tuition": {
        const p = tuitionSchema.safeParse(value);
        result.tuition = p.success ? p.data : EMPTY_SITE_CONTENT.tuition;
        break;
      }
      case "contact": {
        const p = contactSchema.safeParse(value);
        result.contact = p.success ? p.data : EMPTY_SITE_CONTENT.contact;
        break;
      }
      case "legal": {
        const p = legalSchema.safeParse(value);
        result.legal = p.success ? p.data : EMPTY_SITE_CONTENT.legal;
        break;
      }
    }
  }
  return result;
}
