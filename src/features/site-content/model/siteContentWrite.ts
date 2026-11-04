import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export const SITE_CONTENT_KEYS = [
  "notice",
  "classes",
  "tuition",
  "contact",
  "legal",
  "points_goal",
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
};

export const MAX_CLASSES = 10;

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
