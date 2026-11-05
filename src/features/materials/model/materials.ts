import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

/** 확장자 → 올릴 때 쓰는 MIME. 버킷 allowed_mime_types와 같아야 해요(브라우저가 hwp 형식을 모를 때가 많아요). */
export const MATERIAL_TYPES = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  hwp: "application/x-hwp",
  hwpx: "application/vnd.hancom.hwpx",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;
export type MaterialExt = keyof typeof MATERIAL_TYPES;

export const MATERIAL_MAX_BYTES = 20 * 1024 * 1024;
export const MATERIAL_ACCEPT = ".pdf,.jpg,.jpeg,.png,.hwp,.hwpx,.doc,.docx";
export const TYPE_MESSAGE =
  "PDF·이미지(jpg·png)·한글(hwp·hwpx)·워드(doc·docx) 파일만 올릴 수 있어요.";
export const SIZE_MESSAGE =
  "파일이 20MB보다 커요. 20MB 이하로 줄이거나 나눠서 올려 주세요.";
export const EMPTY_FILE_MESSAGE = "빈 파일이에요. 다른 파일을 골라 주세요.";

export type Material = {
  id: string;
  classId: string;
  className: string;
  title: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number;
  createdAt: string;
};

/** 파일 이름에서 확장자를 골라요. jpeg는 jpg로 맞춰요. 허용 목록 밖이면 null. */
export function materialExt(fileName: string): MaterialExt | null {
  const raw = fileName.split(".").pop()?.toLowerCase() ?? "";
  const ext = raw === "jpeg" ? "jpg" : raw;
  return Object.hasOwn(MATERIAL_TYPES, ext) && fileName.includes(".")
    ? (ext as MaterialExt)
    : null;
}

/** 고를 수 없는 파일이면 화면에 보일 문구, 괜찮으면 null. */
export function fileProblem(file: {
  name: string;
  size: number;
}): string | null {
  if (materialExt(file.name) === null) return TYPE_MESSAGE;
  if (file.size === 0) return EMPTY_FILE_MESSAGE;
  if (file.size > MATERIAL_MAX_BYTES) return SIZE_MESSAGE;
  return null;
}

/** 내려받을 때 보일 이름: 제어 문자·경로 문자를 빼고 200자까지. */
export function safeFileName(name: string): string {
  const cleaned = [...name.replace(/[\u0000-\u001f\u007f-\u009f/\\]/g, "")]
    .slice(-200)
    .join("")
    .trim();
  return cleaned === "" ? "자료" : cleaned;
}

export function newMaterialPath(classId: string, ext: MaterialExt): string {
  return `${classId}/${crypto.randomUUID()}.${ext}`;
}

/** 1536 → "1.5KB", 2_500_000 → "2.4MB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const TITLE_MESSAGE = "제목을 1~100자로 입력해 주세요.";

export const materialFormSchema = z.object({
  title: z
    .string()
    .trim()
    .refine((v) => {
      const n = [...v].length;
      return n >= 1 && n <= 100;
    }, TITLE_MESSAGE)
    .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE),
});
export type MaterialFormInput = z.input<typeof materialFormSchema>;
export type MaterialFormOutput = z.output<typeof materialFormSchema>;

/** 반 이름별로 묶어요(반 이름순, 각 반 안은 받은 순서 그대로). */
export function groupByClass(
  items: Material[],
): { className: string; items: Material[] }[] {
  const map = new Map<string, Material[]>();
  for (const m of items) {
    const list = map.get(m.className) ?? [];
    list.push(m);
    map.set(m.className, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([className, list]) => ({ className, items: list }));
}
