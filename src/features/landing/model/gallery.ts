export type GalleryPhoto = { src: string; alt: string };

/** 학원 사진 띠. 지금은 예시 그림이고, 실제 사진을 받으면 public/gallery에 넣고 이 목록만 바꿔요. */
export const GALLERY_PHOTOS: readonly GalleryPhoto[] = [
  { src: "/gallery/sample-1.svg", alt: "(예시) 창가 자리" },
  { src: "/gallery/sample-2.svg", alt: "(예시) 강의실" },
  { src: "/gallery/sample-3.svg", alt: "(예시) 자습 공간" },
  { src: "/gallery/sample-4.svg", alt: "(예시) 교재 책장" },
  { src: "/gallery/sample-5.svg", alt: "(예시) 상담실" },
  { src: "/gallery/sample-6.svg", alt: "(예시) 입구" },
];
