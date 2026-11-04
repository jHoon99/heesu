import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export const SITE_CONTENT_KEYS = [
  "notice",
  "classes",
  "tuition",
  "contact",
  "legal",
  "points_goal",
  "about",
] as const;
export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

export type EditableClass = {
  name: string;
  grades: string;
  schedule: string;
  capacity: string;
};
export type EditableSiteContent = {
  notice: { title: string; body: string; visible: boolean };
  classes: EditableClass[];
  tuition: { monthly: string; textbook: string; note: string };
  contact: { phone: string; address: string };
  legal: {
    academyName: string;
    registrationNo: string;
    subjects: string;
    tuitionNotice: string;
  };
  pointsGoal: string;
  about: { intro: string; items: EditableAboutLink[] };
};
export type EditableAboutLink = { title: string; url: string };

export const MAX_CLASSES = 10;
export const MAX_ABOUT_LINKS = 10;
export const EMPTY_ABOUT_LINK: EditableAboutLink = { title: "", url: "" };

// ---- read (raw DB value -> form strings) ----

function obj(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function readEditable(
  rows: { key: string; value: unknown }[],
): EditableSiteContent {
  const raw = (key: string): unknown => rows.find((r) => r.key === key)?.value;
  const notice = obj(raw("notice"));
  const tuition = obj(raw("tuition"));
  const contact = obj(raw("contact"));
  const legal = obj(raw("legal"));
  const classesRaw = raw("classes");
  const goal = raw("points_goal");
  const about = obj(raw("about"));
  const aboutItems: EditableAboutLink[] = Array.isArray(about.items)
    ? about.items.slice(0, MAX_ABOUT_LINKS).map((it) => {
        const o = obj(it);
        return { title: str(o.title), url: str(o.url) };
      })
    : [];
  const classes: EditableClass[] = Array.isArray(classesRaw)
    ? classesRaw
        .filter((c) => typeof c === "object" && c !== null && !Array.isArray(c))
        .slice(0, MAX_CLASSES)
        .map((c) => {
          const o = obj(c);
          return {
            name: str(o.name),
            grades: str(o.grades),
            schedule: str(o.schedule),
            capacity:
              typeof o.capacity === "number" && Number.isInteger(o.capacity)
                ? String(o.capacity)
                : "",
          };
        })
    : [];
  return {
    notice: {
      title: str(notice.title),
      body: str(notice.body),
      visible: Object.keys(notice).length > 0 && notice.visible !== false,
    },
    classes,
    tuition: {
      monthly: str(tuition.monthly),
      textbook: str(tuition.textbook),
      note: str(tuition.note),
    },
    contact: { phone: str(contact.phone), address: str(contact.address) },
    legal: {
      academyName: str(legal.academy_name),
      registrationNo: str(legal.registration_no),
      subjects: str(legal.subjects),
      tuitionNotice: str(legal.tuition_notice),
    },
    pointsGoal:
      typeof goal === "number" && Number.isInteger(goal) ? String(goal) : "",
    // 저장된 링크가 없으면 빈 카드 하나로 시작해요.
    about: {
      intro: str(about.intro),
      items: aboutItems.length > 0 ? aboutItems : [{ ...EMPTY_ABOUT_LINK }],
    },
  };
}

// ---- write (form strings -> DB jsonb shape) ----

function checked(max: number, multiline: boolean) {
  return z
    .string()
    .refine((v) => !hasControlChars(v, { multiline }), CONTROL_CHAR_MESSAGE)
    .transform((v) => v.trim())
    .pipe(z.string().max(max, `${max}자까지 쓸 수 있어요.`));
}
const blankToNull = (v: string) => (v === "" ? null : v);
const line = (max: number) => checked(max, false).transform(blankToNull);
const multi = (max: number) => checked(max, true).transform(blankToNull);

export const noticeWriteSchema = z
  .object({ title: line(40), body: multi(500), visible: z.boolean() })
  .superRefine((v, ctx) => {
    if (v.visible && v.title === null)
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "공지를 보이려면 제목을 입력해 주세요.",
      });
  });

const CAPACITY_MESSAGE = "정원은 1~50 사이 숫자로 입력해 주세요.";
const capacity = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .refine((v) => v === "" || /^\d+$/.test(v), CAPACITY_MESSAGE)
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || (v >= 1 && v <= 50), CAPACITY_MESSAGE),
  );

const className = checked(30, false).pipe(
  z.string().min(1, "반 이름을 입력해 주세요."),
);

export const classesWriteSchema = z
  .array(
    z.object({
      name: className,
      grades: line(30),
      schedule: line(60),
      capacity,
    }),
  )
  .max(MAX_CLASSES, "반은 10개까지 넣을 수 있어요.");

export const tuitionWriteSchema = z.object({
  monthly: line(100),
  textbook: line(100),
  note: multi(500),
});

const PHONE_MESSAGE = "전화번호는 063-000-0000처럼 숫자와 -로 입력해 주세요.";
export const contactWriteSchema = z.object({
  phone: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .refine(
          (v) => v === "" || /^0\d{1,2}-\d{3,4}-\d{4}$/.test(v),
          PHONE_MESSAGE,
        )
        .transform(blankToNull),
    ),
  address: line(100),
});

export const legalWriteSchema = z
  .object({
    academyName: line(40),
    registrationNo: line(40),
    subjects: line(40),
    tuitionNotice: multi(500),
  })
  .transform((v) => ({
    academy_name: v.academyName,
    registration_no: v.registrationNo,
    subjects: v.subjects,
    tuition_notice: v.tuitionNotice,
  }));

const GOAL_MESSAGE = "목표는 1~10000 사이 숫자로 입력해 주세요.";
export const pointsGoalWriteSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .regex(/^\d+$/, GOAL_MESSAGE)
      .transform(Number)
      .refine((n) => n >= 1 && n <= 10000, GOAL_MESSAGE),
  );

// 소개: 소개 글(여러 줄, 300자)과 링크 카드. 제목·주소가 둘 다 빈 카드는 저장할 때 빼요.
const URL_MESSAGE = "https://로 시작하는 주소를 붙여 넣어 주세요.";
// DB 검사와 같은 규칙이에요: https://만, 공백·<>"'\\ 없이 뒤에 1~500자.
const HTTPS_URL = /^https:\/\/[^\s<>"'\\]{1,500}$/;

function isHttpsUrl(v: string): boolean {
  if (!HTTPS_URL.test(v)) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

const linkTitle = checked(40, false).pipe(
  z.string().min(1, "제목을 입력해 주세요."),
);
const linkUrl = z
  .string()
  .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE)
  .transform((v) => v.trim())
  .pipe(z.string().refine(isHttpsUrl, URL_MESSAGE));

const aboutLinkSchema = z.object({ title: linkTitle, url: linkUrl });
type AboutLinkOut = z.output<typeof aboutLinkSchema>;

const isBlankLink = (v: EditableAboutLink) =>
  v.title.trim() === "" && v.url.trim() === "";

// 제목·주소가 둘 다 빈 카드는 검사하지 않고 빼요. 오류는 화면의 그 칸에 붙어요.
const aboutItemSchema = z
  .object({ title: z.string(), url: z.string() })
  .transform((v, ctx): AboutLinkOut | null => {
    if (isBlankLink(v)) return null;
    const parsed = aboutLinkSchema.safeParse(v);
    if (parsed.success) return parsed.data;
    for (const issue of parsed.error.issues)
      ctx.addIssue({
        code: "custom",
        path: issue.path,
        message: issue.message,
      });
    return z.NEVER;
  });

export const aboutWriteSchema = z.object({
  intro: multi(300),
  items: z
    .array(aboutItemSchema)
    .max(MAX_ABOUT_LINKS, "링크는 10개까지 넣을 수 있어요.")
    .transform((items) =>
      items.filter((it): it is AboutLinkOut => it !== null),
    ),
});
