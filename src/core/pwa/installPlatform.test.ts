import { describe, expect, it } from "vitest";
import { installPlatform, kakaoOpenExternalHref } from "./installPlatform";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const GALAXY =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36";
const KAKAO_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0 Mobile Safari/537.36 KAKAOTALK 10.8.0";
const KAKAO_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0";
const INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("installPlatform", () => {
  it("tells phones, tablets, in-app browsers and computers apart", () => {
    expect(installPlatform(IPHONE, 5)).toBe("ios");
    expect(installPlatform(IPAD_DESKTOP_MODE, 5)).toBe("ios");
    expect(installPlatform(GALAXY, 5)).toBe("android");
    expect(installPlatform(KAKAO_ANDROID, 5)).toBe("kakao");
    expect(installPlatform(KAKAO_IOS, 5)).toBe("kakao");
    expect(installPlatform(INSTAGRAM, 5)).toBe("in-app");
    expect(installPlatform(MAC_CHROME, 0)).toBe("desktop");
  });

  it("opens the current page in the phone's own browser from KakaoTalk", () => {
    expect(kakaoOpenExternalHref("https://heesu.pages.dev/s?x=1")).toBe(
      "kakaotalk://web/openExternal?url=https%3A%2F%2Fheesu.pages.dev%2Fs%3Fx%3D1",
    );
  });
});
