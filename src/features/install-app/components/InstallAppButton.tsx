"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button, cn } from "@/design-system";
import { promptInstall } from "@/core/pwa";
import {
  useCanPromptInstall,
  useInstallPlatform,
  useIsStandalone,
} from "../state/useInstall";
import { InstallGuide } from "./InstallGuide";

/**
 * "앱으로 설치하기" 버튼. 안드로이드는 바로 설치 창을 띄우고, 그 밖에는 기기에 맞는 안내를 보여 줘요.
 * 이미 홈 화면 앱으로 열었으면 보이지 않아요.
 */
export function InstallAppButton({
  variant = "secondary",
  block = false,
  className,
}: {
  variant?: "primary" | "secondary" | "ghost";
  block?: boolean;
  className?: string;
}) {
  const standalone = useIsStandalone();
  const canPrompt = useCanPromptInstall();
  const platform = useInstallPlatform();
  const [guide, setGuide] = useState(false);
  if (standalone) return null;

  async function install() {
    if (canPrompt && (await promptInstall()) !== "unavailable") return;
    setGuide(true);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="md"
        block={block}
        icon={Download}
        className={cn(className)}
        onClick={() => void install()}
      >
        앱으로 설치하기
      </Button>
      <InstallGuide
        open={guide}
        platform={platform}
        onClose={() => setGuide(false)}
      />
    </>
  );
}
