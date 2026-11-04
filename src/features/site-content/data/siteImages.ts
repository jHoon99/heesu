import { supabase } from "@/core/supabase/client";
import { newSiteImagePath, SITE_IMAGE_BUCKET } from "../model/siteImages";

/** 긴 변을 이 크기로 줄여서 올려요. 휴대폰 사진(수 MB)도 홈페이지에서 빨리 떠요. */
const MAX_SIDE = 1600;

export class ImageReadError extends Error {
  constructor() {
    super("사진을 읽을 수 없어요. JPG나 PNG 사진으로 다시 골라 주세요.");
    this.name = "ImageReadError";
  }
}

/** 사진을 줄여 JPG로 만들어요. 브라우저가 못 읽는 형식이면 ImageReadError. */
export async function shrinkImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageReadError();
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageReadError();
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new ImageReadError();
  return blob;
}

/** 사진을 새 경로로 올리고 그 경로를 돌려줘요. */
export async function uploadSiteImage(file: File): Promise<string> {
  const blob = await shrinkImage(file);
  const path = newSiteImagePath("jpg");
  const { error } = await supabase.storage
    .from(SITE_IMAGE_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
