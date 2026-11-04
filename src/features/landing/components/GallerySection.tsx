import { cn, Reveal } from "@/design-system";
import { GALLERY_PHOTOS, type GalleryPhoto } from "../model/gallery";
import { SectionHeading } from "./SectionHeading";

function Photo({ photo, hidden }: { photo: GalleryPhoto; hidden?: boolean }) {
  // 간격을 gap 대신 오른쪽 여백으로 줘야 두 묶음 너비가 똑같아서 이음매가 안 보여요.
  return (
    <li
      className={cn(
        "w-68 shrink-0 pr-4 md:w-84",
        hidden && "motion-reduce:hidden",
      )}
      aria-hidden={hidden || undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기, 최적화 없음 */}
      <img
        src={photo.src}
        alt={hidden ? "" : photo.alt}
        width={800}
        height={600}
        loading="lazy"
        draggable={false}
        className="aspect-[4/3] w-full rounded-xl bg-bg-subtle object-cover shadow-sm"
      />
    </li>
  );
}

/**
 * 맨 아래 학원 사진 띠: 옆으로 천천히 흘러가요. 손가락이나 마우스를 올리면 멈춰요.
 * 동작 줄이기를 켠 기기에서는 흐르지 않고 손으로 옆으로 밀어 봐요.
 */
export function GallerySection() {
  return (
    <section
      id="gallery"
      aria-label="학원 사진"
      className="flex flex-col gap-6"
    >
      <div className="mx-auto w-full max-w-[720px] px-4">
        <Reveal>
          <SectionHeading eyebrow="SPACE" title="희수영어의 공간" />
        </Reveal>
      </div>
      <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
        <ul className="flex w-max group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-safe:animate-marquee">
          {GALLERY_PHOTOS.map((p) => (
            <Photo key={p.src} photo={p} />
          ))}
          {/* 끊김 없이 돌도록 한 번 더 이어 붙여요. 화면 읽기 프로그램에는 숨겨요. */}
          {GALLERY_PHOTOS.map((p) => (
            <Photo key={`dup-${p.src}`} photo={p} hidden />
          ))}
        </ul>
      </div>
    </section>
  );
}
