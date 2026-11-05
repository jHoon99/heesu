import { Badge, Card, StatusChip } from "@/design-system";
import { dayLabelOf, formatShortDate } from "@/features/sessions";
import type { GuardianView } from "../model/guardian";

const day = (d: string) => `${formatShortDate(d)}(${dayLabelOf(d)})`;
const text = "min-w-0 whitespace-pre-line break-words";

export function GuardianRecordView({ view }: { view: GuardianView }) {
  return (
    <div className="flex flex-col gap-4">
      <header className="min-w-0">
        <h1 className="font-serif text-h2 break-words text-text">
          {view.name} 학생의 학습 기록
        </h1>
        <p className="text-caption text-text-muted">{day(view.today)} 기준</p>
      </header>

      <Card title="누적 포인트">
        <p className="text-number-xl text-text">{view.totalPoints}점</p>
      </Card>

      <Card title="이번 주 수업">
        {view.week.length === 0 ? (
          <p className="text-body text-text-muted">
            이번 주에는 아직 수업 기록이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {view.week.map((w, i) => (
              <li
                key={`${w.date}-${i}`}
                className="flex min-w-0 flex-col gap-1"
              >
                <p className={`${text} text-body font-semibold text-text`}>
                  {day(w.date)} · {w.className}
                </p>
                {w.summary ? (
                  <p className={`${text} text-body text-text`}>
                    <span className="text-caption text-text-muted">
                      수업 내용
                    </span>
                    <br />
                    {w.summary}
                  </p>
                ) : null}
                {w.homework ? (
                  <p className={`${text} text-body text-text`}>
                    <span className="text-caption text-text-muted">숙제</span>
                    <br />
                    {w.homework}
                  </p>
                ) : null}
                {w.homeworkDue ? (
                  <p className="text-caption text-text-muted">
                    {`마감 ${day(w.homeworkDue)}`}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="최근 4주 출결·숙제">
        {view.records.length === 0 ? (
          <p className="text-body text-text-muted">
            최근 4주 동안 수업 기록이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {view.records.map((r, i) => (
              <li
                key={`${r.date}-${i}`}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2"
              >
                <span className={`${text} text-body text-text`}>
                  {day(r.date)} · {r.className}
                </span>
                <span className="flex shrink-0 gap-1">
                  <StatusChip status={r.attendance} ariaLabel="출결" />
                  <StatusChip status={r.homework} ariaLabel="숙제" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="최근 4주 테스트">
        {view.tests.length === 0 ? (
          <p className="text-body text-text-muted">
            최근 4주 동안 테스트 기록이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {view.tests.map((t, i) => (
              <li
                key={`${t.date}-${i}`}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2"
              >
                <span className={`${text} text-body text-text`}>
                  {day(t.date)} · {t.kind === "word" ? "단어" : "문법"} ·{" "}
                  {t.title}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-body text-text tabular-nums">
                    {`${t.score}/${t.maxScore}`}
                  </span>
                  {t.passScore !== null && t.score < t.passScore ? (
                    <Badge tone="warning">재시험</Badge>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="클리닉(재시험·보완)">
        {view.clinic.length === 0 ? (
          <p className="text-body text-text-muted">
            지금 해야 할 재시험·보완이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {view.clinic.map((c, i) => (
              <li
                key={`${c.createdOn}-${i}`}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2"
              >
                <span className={`${text} text-body text-text`}>
                  {c.kind === "word_retest" ? "단어 재시험" : "개념 보완"} ·{" "}
                  {day(c.createdOn)}
                </span>
                <Badge tone={c.status === "open" ? "warning" : "brand"}>
                  {c.status === "open"
                    ? "하는 중"
                    : `${c.doneOn ? day(c.doneOn) : ""} 끝냄`.trim()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="text-caption text-text-muted">
        <p>
          이 링크를 가진 사람은 누구나 이 화면을 볼 수 있어요. 다른 사람에게
          보내지 말아 주세요.
        </p>
        <p>궁금한 점은 학원에 문의해 주세요.</p>
      </div>
    </div>
  );
}
