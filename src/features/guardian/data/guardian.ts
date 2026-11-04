import { supabase } from "@/core/supabase/client";
import { parseGuardianView, type GuardianView } from "../model/guardian";

// 기본 POST로 부른다: GET이면 토큰이 쿼리스트링에 실려 로그에 남고, 함수도 POST가 아니면 거부한다.
export async function getGuardianView(token: string): Promise<GuardianView> {
  const { data, error } = await supabase.rpc("guardian_view", {
    p_token: token,
  });
  if (error) throw error;
  return parseGuardianView(data);
}
