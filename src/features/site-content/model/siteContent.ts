import { z } from "zod";

export type Notice = { title: string; body: string };
export type ClassInfo = {
  name: string;
  grades: string | null;
  schedule: string | null;
  capacity: number | null;
};
export type Tuition = {
  monthly: string | null;
  textbook: string | null;
  note: string | null;
};
export type Contact = { phone: string | null; address: string | null };
export type Legal = {
  academyName: string | null;
  registrationNo: string | null;
  subjects: string | null;
  tuitionNotice: string | null;
};
/** 블로그 이야기 카드: 제목, 블로그 주소, 카드에 보이는 짧은 소개(여러 줄). */
export type AboutLink = { title: string; url: string; teaser: string | null };
export type About = { intro: string | null; items: AboutLink[] };
export type SiteContent = {
  notice: Notice | null;
  classes: ClassInfo[];
  tuition: Tuition;
  contact: Contact;
  legal: Legal;
  pointsGoal: number;
  about: About;
};

export const DEFAULT_POINTS_GOAL = 30;
export const MAX_ABOUT_LINKS = 10;

export const EMPTY_SITE_CONTENT: SiteContent = {
  notice: null,
  classes: [],
  tuition: { monthly: null, textbook: null, note: null },
  contact: { phone: null, address: null },
  legal: {
    academyName: null,
    registrationNo: null,
    subjects: null,
    tuitionNotice: null,
  },
  pointsGoal: DEFAULT_POINTS_GOAL,
  about: { intro: null, items: [] },
};

// Trimmed non-empty string, otherwise null. Never throws.
const text = z
  .unknown()
  .optional()
  .transform((v) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  });

const capacity = z
  .unknown()
  .optional()
  .transform((v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null,
  );

const noticeSchema = z
  .object({ title: text, body: text, visible: z.unknown().optional() })
  .transform((v): Notice | null =>
    v.visible === false || v.title === null
      ? null
      : { title: v.title, body: v.body ?? "" },
  );

const classItemSchema = z
  .object({ name: text, grades: text, schedule: text, capacity })
  .transform((v): ClassInfo | null =>
    v.name === null ? null : { ...v, name: v.name },
  );

const tuitionSchema = z.object({ monthly: text, textbook: text, note: text });
const contactSchema = z.object({ phone: text, address: text });
const legalSchema = z
  .object({
    academy_name: text,
    registration_no: text,
    subjects: text,
    tuition_notice: text,
  })
  .transform((v): Legal => ({
    academyName: v.academy_name,
    registrationNo: v.registration_no,
    subjects: v.subjects,
    tuitionNotice: v.tuition_notice,
  }));

function parseClasses(value: unknown): ClassInfo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = classItemSchema.safeParse(item);
    return parsed.success && parsed.data ? [parsed.data] : [];
  });
}

/** https 주소만 링크로 써요. javascript:·data:·http 같은 주소와 제목 없는 칸은 버려요. */
function safeHttpsUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    return new URL(v.trim()).protocol === "https:" ? v.trim() : null;
  } catch {
    return null;
  }
}

function parseAbout(value: unknown): About {
  const o =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const intro = text.safeParse(o.intro);
  const items = Array.isArray(o.items)
    ? o.items.flatMap((item): AboutLink[] => {
        if (typeof item !== "object" || item === null) return [];
        const { title, url, teaser } = item as Record<string, unknown>;
        const t = typeof title === "string" ? title.trim() : "";
        const u = safeHttpsUrl(url);
        const parsedTeaser = text.safeParse(teaser);
        const tz = parsedTeaser.success ? parsedTeaser.data : null;
        return t !== "" && u !== null ? [{ title: t, url: u, teaser: tz }] : [];
      })
    : [];
  return {
    intro: intro.success ? intro.data : null,
    items: items.slice(0, MAX_ABOUT_LINKS),
  };
}

export function parseSiteContent(
  rows: { key: string; value: unknown }[],
): SiteContent {
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
      case "about":
        result.about = parseAbout(value);
        break;
      case "points_goal":
        result.pointsGoal =
          typeof value === "number" &&
          Number.isInteger(value) &&
          value >= 1 &&
          value <= 10000
            ? value
            : DEFAULT_POINTS_GOAL;
        break;
    }
  }
  return result;
}
