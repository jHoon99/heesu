// 법률 검토 전 초안 (2026-11-05). 화면에는 쓰지 않는다.
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Blank } from "../components/Blank";
import { SiteChrome } from "./SiteChrome";

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3">
      <h2 className="font-serif text-heading-serif">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-gray-700">
        {children}
      </div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}

export function PrivacyScreen() {
  return (
    <SiteChrome>
      {() => (
        <>
          <header className="border-b border-border">
            <div className="mx-auto flex h-15 max-w-[720px] items-center px-4">
              <Link
                href="/"
                aria-label="희수영어 처음으로"
                className="flex items-center gap-2 text-text-brand no-underline"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기, 최적화 없음 */}
                <img
                  src="/brand/heesu-mark.svg"
                  alt=""
                  width={36}
                  height={33}
                />
                <span className="font-serif text-h2 text-[20px] leading-7">
                  희수영어
                </span>
              </Link>
            </div>
          </header>
          <main className="mx-auto flex max-w-[720px] flex-col gap-10 px-4 py-10 pb-16">
            <h1 className="font-serif text-h1">개인정보처리방침</h1>

            <Section title="1. 수집 항목과 목적">
              <div id="consult" className="flex scroll-mt-6 flex-col gap-2">
                <h3 className="text-label text-text">상담 신청</h3>
                <List>
                  <li>
                    수집 항목: 학부모 성함, 연락처, 학생 학년, 궁금한 점(선택),
                    동의 시각과 동의서 버전
                  </li>
                  <li>이용 목적: 상담 연락</li>
                  <li>
                    보관: 등록으로 이어지지 않으면 신청일로부터 6개월 뒤 파기
                  </li>
                </List>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-label text-text">수강생 관리</h3>
                <List>
                  <li>학생 이름, 학년, 학교</li>
                  <li>보호자 이름, 연락처</li>
                  <li>출결, 숙제, 포인트 기록</li>
                  <li>질문 내용</li>
                  <li>영상 시청 기록</li>
                </List>
              </div>
            </Section>

            <Section title="2. 보관 기간">
              <List>
                <li>
                  상담 신청은 등록으로 이어지지 않으면 신청일로부터 6개월 뒤에
                  파기해요.
                </li>
                <li>
                  수강생 정보는 퇴원할 때 파기해요. 법령에 따라 보존해야 하는
                  기록은 <Blank>보존 기간</Blank> 동안 보관해요.
                </li>
                <li>접근 기록은 1년 동안 보관해요.</li>
                <li>백업은 7일 동안 보관해요.</li>
              </List>
            </Section>

            <Section title="3. 처리위탁과 국외이전">
              <List>
                <li>
                  Supabase: 데이터 저장과 로그인. 저장 위치는 서울 리전이에요.
                  이전 국가 <Blank>국가</Blank>, 이전 항목 <Blank>항목</Blank>,
                  보유 기간 <Blank>기간</Blank>
                </li>
                <li>
                  Cloudflare: 웹사이트 전송과 자동 입력 방지. 이전 국가{" "}
                  <Blank>국가</Blank>, 이전 항목 <Blank>항목</Blank>, 보유 기간{" "}
                  <Blank>기간</Blank>
                </li>
                <li>
                  Sentry: 오류 기록 (도입 예정). 이전 국가 <Blank>국가</Blank>,
                  이전 항목 <Blank>항목</Blank>, 보유 기간 <Blank>기간</Blank>
                </li>
                <li>
                  솔라피: 알림톡 발송 (도입 예정). 이전 국가 <Blank>국가</Blank>
                  , 이전 항목 <Blank>항목</Blank>, 보유 기간 <Blank>기간</Blank>
                </li>
              </List>
            </Section>

            <Section title="4. 파기 절차와 방법">
              <p>
                보관 기간이 지나거나 목적을 이룬 개인정보는 지체 없이 파기해요.
                전자 파일은 복구할 수 없는 방법으로 삭제하고, 출력물은
                분쇄하거나 소각해요.
              </p>
            </Section>

            <Section title="5. 14세 미만 아동">
              <p>
                14세 미만 아동의 개인정보는 법정대리인 동의를 받아 처리해요.
                상담 신청은 보호자가 작성해 주세요.
              </p>
            </Section>

            <Section title="6. 정보주체의 권리">
              <p>
                개인정보의 열람, 정정, 삭제, 처리정지를 요청할 수 있어요. 아래
                문의처로 전화하거나 학원에 직접 말씀해 주시면 지체 없이
                처리해요.
              </p>
            </Section>

            <Section title="7. 안전성 확보 조치">
              <List>
                <li>개인정보에 접근할 수 있는 사람을 최소한으로 제한해요.</li>
                <li>원장 계정은 2단계 인증을 써요.</li>
                <li>접근 기록을 보관해요.</li>
              </List>
            </Section>

            <Section title="8. 개인정보 보호책임자와 문의처">
              <p>
                보호책임자 <Blank>이름</Blank>
              </p>
              <p>
                문의처 <Blank>연락처</Blank>
              </p>
            </Section>

            <Section title="9. 시행일">
              <p>
                <Blank>시행일</Blank>
              </p>
            </Section>
          </main>
        </>
      )}
    </SiteChrome>
  );
}
