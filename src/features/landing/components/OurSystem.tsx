const STEPS = [
  {
    title: "정규 수업",
    body: "어휘·문법·구문·독해 기본기를 체계적으로 다지는 수업",
  },
  {
    title: "반복 테스트",
    body: "매 수업 단어 시험과 개념 확인을 통한 학습 점검",
  },
  {
    title: "매주 개별 클리닉",
    body: "오답 재검사, 개념 백지 테스트, 독해 리뷰 테스트",
  },
  {
    title: "내신 집중 관리",
    body: "학교별 시험 범위 분석과 실전 문제 적용",
  },
] as const;

/** 소개 섹션 맨 위: 희수영어 수업 방식을 네 단계로 한눈에 보여 줘요. 자세한 이야기는 아래 블로그 카드로 이어져요. */
export function OurSystem() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-surface px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-2">
        <span className="font-serif text-caption tracking-[0.3em] text-text-brand">
          OUR SYSTEM
        </span>
        <h3 className="font-serif text-body-lg font-semibold text-brown-900">
          기본을 가르치는 것에서 끝나지 않습니다.
          <br />
          이해하고, 적용하고, 자신의 실력으로 만들 때까지.
        </h3>
      </div>
      <ol className="grid grid-cols-1 border-t border-border sm:grid-cols-2 sm:gap-x-6">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3 border-b border-border py-4 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
          >
            <span className="w-8 shrink-0 font-serif text-[24px] leading-[30px] text-text-brand italic">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h4 className="font-serif text-body font-semibold text-brown-900">
                {step.title}
              </h4>
              <p className="text-body-sm text-text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
