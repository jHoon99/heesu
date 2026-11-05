import { describe, expect, it } from "vitest";
import {
  EMPTY_FILE_MESSAGE,
  fileProblem,
  formatSize,
  groupByClass,
  materialExt,
  materialFormSchema,
  safeFileName,
  SIZE_MESSAGE,
  TYPE_MESSAGE,
  type Material,
} from "./materials";

describe("materialExt", () => {
  it.each([
    ["3과.PDF", "pdf"],
    ["사진.jpeg", "jpg"],
    ["본문.hwp", "hwp"],
    ["본문.hwpx", "hwpx"],
    ["시험지.docx", "docx"],
  ])("%s -> %s", (name, ext) => {
    expect(materialExt(name)).toBe(ext);
  });
  it.each([["a.exe"], ["a.mp4"], ["pdf"], ["a.constructor"], ["a.toString"]])(
    "rejects %s",
    (name) => {
      expect(materialExt(name)).toBeNull();
    },
  );
});

describe("fileProblem", () => {
  it("checks type, empty and 20MB", () => {
    expect(fileProblem({ name: "a.pdf", size: 10 })).toBeNull();
    expect(fileProblem({ name: "a.zip", size: 10 })).toBe(TYPE_MESSAGE);
    expect(fileProblem({ name: "a.pdf", size: 0 })).toBe(EMPTY_FILE_MESSAGE);
    expect(fileProblem({ name: "a.pdf", size: 20 * 1024 * 1024 })).toBeNull();
    expect(fileProblem({ name: "a.pdf", size: 20 * 1024 * 1024 + 1 })).toBe(
      SIZE_MESSAGE,
    );
  });
});

describe("safeFileName", () => {
  it("drops path and control characters", () => {
    expect(safeFileName("../a\u0007/b.pdf")).toBe("..ab.pdf");
    expect(safeFileName("\u0001")).toBe("자료");
  });
  it("keeps the end (extension) when too long", () => {
    const out = safeFileName(`${"가".repeat(300)}.pdf`);
    expect([...out]).toHaveLength(200);
    expect(out.endsWith(".pdf")).toBe(true);
  });
});

describe("formatSize", () => {
  it("shows KB under 1MB and MB with one decimal", () => {
    expect(formatSize(10)).toBe("1KB");
    expect(formatSize(1536)).toBe("2KB");
    expect(formatSize(2_500_000)).toBe("2.4MB");
  });
});

describe("materialFormSchema", () => {
  it("trims the title and rejects a blank one", () => {
    expect(materialFormSchema.parse({ title: " 3과 " })).toEqual({
      title: "3과",
    });
    expect(materialFormSchema.safeParse({ title: " " }).success).toBe(false);
  });
});

describe("groupByClass", () => {
  it("groups by class name in Korean order", () => {
    const base: Material = {
      id: "1",
      classId: "c",
      className: "중등반",
      title: "t",
      fileName: "f.pdf",
      storagePath: "p",
      sizeBytes: 1,
      createdAt: "2026-11-05T00:00:00Z",
    };
    const out = groupByClass([
      base,
      { ...base, id: "2", className: "고등반" },
      { ...base, id: "3" },
    ]);
    expect(out.map((g) => [g.className, g.items.map((i) => i.id)])).toEqual([
      ["고등반", ["2"]],
      ["중등반", ["1", "3"]],
    ]);
  });
});
