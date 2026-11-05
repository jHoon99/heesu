import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { uploadMaterial } from "../data/materials";
import { MaterialUploadForm } from "./MaterialUploadForm";

vi.mock("../data/materials");
const upload = vi.mocked(uploadMaterial);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MaterialUploadForm classId="c1" />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup({ applyAccept: false });
}

describe("MaterialUploadForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    upload.mockResolvedValue(undefined);
  });

  it("uploads a picked file with the title", async () => {
    const user = setup();
    const file = new File(["%PDF"], "3과.pdf", { type: "application/pdf" });
    await user.type(screen.getByLabelText("제목"), "3과 프린트");
    await user.upload(screen.getByLabelText("파일"), file);
    await user.click(screen.getByRole("button", { name: "올리기" }));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(upload.mock.calls[0]?.[0]).toEqual({
      classId: "c1",
      title: "3과 프린트",
      file,
    });
    expect(await screen.findByText("자료를 올렸어요.")).toBeInTheDocument();
  });

  it("asks for a file when none is picked", async () => {
    const user = setup();
    await user.type(screen.getByLabelText("제목"), "3과");
    await user.click(screen.getByRole("button", { name: "올리기" }));
    expect(
      await screen.findByText("올릴 파일을 골라 주세요."),
    ).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it("refuses an unsupported file right away", async () => {
    const user = setup();
    await user.upload(
      screen.getByLabelText("파일"),
      new File(["x"], "a.zip", { type: "application/zip" }),
    );
    expect(
      screen.getByText(
        "PDF·이미지(jpg·png)·한글(hwp·hwpx)·워드(doc·docx) 파일만 올릴 수 있어요.",
      ),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("제목"), "3과");
    await user.click(screen.getByRole("button", { name: "올리기" }));
    expect(upload).not.toHaveBeenCalled();
  });
});
