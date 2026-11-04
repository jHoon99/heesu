import { env } from "@/core/env";

/** 홈페이지 사진을 두는 공개 버킷이에요. 홍보 사진만 올려요(학생이 나오는 사진은 올리지 않아요). */
export const SITE_IMAGE_BUCKET = "site-images";

// DB 검사(check_site_content)와 같은 규칙: about/<uuid>.jpg|png|webp
const SITE_IMAGE_PATH =
  /^about\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function isSiteImagePath(v: unknown): v is string {
  return typeof v === "string" && SITE_IMAGE_PATH.test(v);
}

export function newSiteImagePath(ext: "jpg" | "png" | "webp"): string {
  return `about/${crypto.randomUUID()}.${ext}`;
}

/** 버킷 안 경로를 누구나 볼 수 있는 사진 주소로 바꿔요. */
export function siteImageUrl(path: string, base = env.supabaseUrl): string {
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${SITE_IMAGE_BUCKET}/${path}`;
}
