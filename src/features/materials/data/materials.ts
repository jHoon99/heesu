import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  MATERIAL_TYPES,
  materialExt,
  newMaterialPath,
  safeFileName,
  TYPE_MESSAGE,
  type Material,
} from "../model/materials";

export const MATERIAL_BUCKET = "materials";
const COLUMNS =
  "id, class_id, title, file_name, storage_path, size_bytes, created_at, classes(name)";

type Row = {
  id: string;
  class_id: string;
  title: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
  classes: { name: string } | null;
};

function toMaterial(r: Row): Material {
  return {
    id: r.id,
    classId: r.class_id,
    className: r.classes?.name ?? "",
    title: r.title,
    fileName: r.file_name,
    storagePath: r.storage_path,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  };
}

export async function listClassMaterials(classId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select(COLUMNS)
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toMaterial);
}

/** 학생: RLS가 내 반 자료만 줘요(퇴원생은 0개). */
export async function listMyMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select(COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toMaterial);
}

/** 파일을 먼저 올리고 행을 만들어요. 행 만들기가 실패하면 올린 파일을 지워요. */
export async function uploadMaterial(input: {
  classId: string;
  title: string;
  file: File;
}): Promise<void> {
  const ext = materialExt(input.file.name);
  if (ext === null) throw new Error(TYPE_MESSAGE);
  const path = newMaterialPath(input.classId, ext);
  const up = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, input.file, {
      contentType: MATERIAL_TYPES[ext],
      upsert: false,
    });
  if (up.error) throw up.error;
  const { error } = await supabase.from("materials").insert({
    class_id: input.classId,
    title: input.title,
    file_name: safeFileName(input.file.name),
    storage_path: path,
    size_bytes: input.file.size,
  });
  if (error) {
    await supabase.storage.from(MATERIAL_BUCKET).remove([path]);
    throw error;
  }
}

/** 행을 먼저 지워요(이 순간 학생 접근이 끊겨요). 파일 삭제가 실패해도 행은 되살리지 않아요. */
export async function deleteMaterial(m: {
  id: string;
  storagePath: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("materials")
    .delete()
    .eq("id", m.id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
  await supabase.storage.from(MATERIAL_BUCKET).remove([m.storagePath]);
}

/** 1분짜리 내려받기 주소. 원래 파일 이름으로 저장돼요. 저장·캐시하지 않아요. */
export async function materialDownloadUrl(m: {
  storagePath: string;
  fileName: string;
}): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .createSignedUrl(m.storagePath, 60, { download: m.fileName });
  if (error) throw error;
  return data.signedUrl;
}
