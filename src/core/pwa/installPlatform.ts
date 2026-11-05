/**
 * 홈 화면 추가 방법이 기기·브라우저마다 달라서, 어떤 안내를 보일지 고르는 데 써요.
 * - android: Chrome·삼성 인터넷 등. 대개 버튼 한 번으로 설치 창을 띄울 수 있어요.
 * - ios: 아이폰·아이패드. 애플이 자동 설치를 막아 두어서 공유 → 홈 화면에 추가 안내를 보여요.
 * - kakao: 카카오톡 안 브라우저. 설치가 안 되니 다른 브라우저로 열게 해요.
 * - in-app: 인스타그램·네이버 앱 등 다른 앱 안 브라우저.
 * - desktop: 컴퓨터.
 */
export type InstallPlatform =
  "android" | "ios" | "kakao" | "in-app" | "desktop";

export function installPlatform(
  userAgent: string,
  maxTouchPoints = 0,
): InstallPlatform {
  const ua = userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/Instagram|FBAN|FBAV|NAVER\(inapp|Line\/|DaumApps|everytimeApp/i.test(ua))
    return "in-app";
  // 아이패드는 기본으로 맥처럼 보이게 알려서, 터치가 되는 맥이면 아이패드로 봐요.
  if (
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && maxTouchPoints > 1)
  )
    return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** 카카오톡 안에서 지금 주소를 기본 브라우저로 열어요(아이폰·안드로이드 둘 다). */
export function kakaoOpenExternalHref(url: string): string {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
}
