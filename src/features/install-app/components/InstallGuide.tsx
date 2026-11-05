"use client";

import {
  EllipsisVertical,
  ExternalLink,
  Share,
  SquarePlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants, Modal } from "@/design-system";
import { kakaoOpenExternalHref, type InstallPlatform } from "@/core/pwa";

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-body-sm font-semibold text-text-brand">
        {n}
      </span>
      <span className="min-w-0 pt-0.5 text-body text-text">{children}</span>
    </li>
  );
}

function Icon({ icon: I }: { icon: typeof Share }) {
  return (
    <I
      size={18}
      strokeWidth={1.75}
      aria-hidden="true"
      className="mx-0.5 inline-block -translate-y-px text-text-brand"
    />
  );
}

/** 버튼 한 번으로 설치할 수 없을 때(아이폰, 카카오톡 등) 기기에 맞는 방법을 보여 줘요. */
export function InstallGuide({
  open,
  platform,
  onClose,
}: {
  open: boolean;
  platform: InstallPlatform;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title="홈 화면에 앱 추가하기"
      width={420}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 pb-1 text-left">
        {platform === "ios" ? (
          <>
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Safari 아래쪽(아이패드는 위쪽)의 공유 버튼
                <Icon icon={Share} />을 눌러요.
              </Step>
              <Step n={2}>
                목록을 올려 &lsquo;홈 화면에 추가&rsquo;
                <Icon icon={SquarePlus} />를 골라요.
              </Step>
              <Step n={3}>오른쪽 위 &lsquo;추가&rsquo;를 누르면 끝이에요.</Step>
            </ol>
            <p className="text-body-sm text-text-muted">
              아이폰은 홈 화면 앱의 로그인이 Safari와 따로예요. 추가한 앱을 열고
              한 번 더 로그인해 주세요.
            </p>
          </>
        ) : platform === "kakao" ? (
          <>
            <p className="text-body text-text">
              카카오톡 안에서는 앱을 추가할 수 없어요. 휴대폰 브라우저로 연 다음
              다시 &lsquo;앱으로 설치하기&rsquo;를 눌러 주세요.
            </p>
            <a
              href={kakaoOpenExternalHref(
                typeof window === "undefined" ? "" : window.location.href,
              )}
              className={buttonVariants({ size: "lg", block: true })}
            >
              <ExternalLink size={16} aria-hidden="true" />
              브라우저로 열기
            </a>
          </>
        ) : platform === "in-app" ? (
          <p className="text-body text-text">
            지금 앱 안의 브라우저로 열려 있어요. 오른쪽 위(또는 아래) 메뉴에서
            &lsquo;다른 브라우저로 열기&rsquo;를 고른 다음, 다시 &lsquo;앱으로
            설치하기&rsquo;를 눌러 주세요.
          </p>
        ) : platform === "android" ? (
          <ol className="flex flex-col gap-3">
            <Step n={1}>
              브라우저 메뉴
              <Icon icon={EllipsisVertical} />
              (삼성 인터넷은 아래쪽 ≡)를 눌러요.
            </Step>
            <Step n={2}>
              &lsquo;홈 화면에 추가&rsquo; 또는 &lsquo;앱 설치&rsquo;를 골라요.
            </Step>
            <Step n={3}>&lsquo;설치&rsquo;를 누르면 홈 화면에 생겨요.</Step>
          </ol>
        ) : (
          <p className="text-body text-text">
            휴대폰이나 태블릿에서 이 주소를 열고 &lsquo;앱으로 설치하기&rsquo;를
            눌러 주세요.
          </p>
        )}
      </div>
    </Modal>
  );
}
