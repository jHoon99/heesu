import { describe, expect, it } from "vitest";
import { uploadErrorMessage } from "./upload";

const res = (status: number, body = "") => ({
  originalResponse: { getStatus: () => status, getBody: () => body },
});

describe("uploadErrorMessage", () => {
  it("maps 413 to a size message", () => {
    expect(uploadErrorMessage(res(413))).toBe(
      "파일이 너무 커요. 영상을 나누거나 화질을 낮춰 다시 올려 주세요.",
    );
  });

  it("maps 415 or a mime body to the mp4 message", () => {
    const mp4 = "mp4 파일만 올릴 수 있어요. 파일 형식을 확인해 주세요.";
    expect(uploadErrorMessage(res(415))).toBe(mp4);
    expect(uploadErrorMessage(res(400, '{"error":"invalid_mime_type"}'))).toBe(
      mp4,
    );
  });

  it("maps 401 and 403 to the login message", () => {
    const login =
      "로그인이 만료됐거나 권한이 없어요. 다시 로그인한 뒤 올려 주세요.";
    expect(uploadErrorMessage(res(403))).toBe(login);
    expect(uploadErrorMessage(res(401))).toBe(login);
  });

  it("maps a missing response to the network message", () => {
    expect(uploadErrorMessage({ originalResponse: null })).toBe(
      "인터넷 연결이 끊겼어요. 연결되면 '다시 올리기'를 눌러 이어서 올려 주세요.",
    );
  });

  it("falls back for anything else", () => {
    const other = "업로드하지 못했어요. 잠시 후 다시 올려 주세요.";
    expect(uploadErrorMessage(new Error("x"))).toBe(other);
    expect(uploadErrorMessage(res(500))).toBe(other);
    expect(uploadErrorMessage(null)).toBe(other);
  });
});
