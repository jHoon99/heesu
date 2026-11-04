"use client";

import { Button, Card } from "@/design-system";
import { useSignOut } from "@/core/auth";
import { classifyError } from "@/core/supabase/error";
import { ChangePasswordCard } from "@/features/auth";
import { PointHistoryList } from "@/features/points";
import { useMyProfile } from "@/features/student-shell";
import { InstallGuideCard } from "../components/InstallGuideCard";

export function MyInfoScreen() {
  const profileQuery = useMyProfile();
  const signOut = useSignOut();
  const profile = profileQuery.data;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-h1 text-text">내 정보</h1>
      {profileQuery.isError && profile === undefined ? (
        <Card>
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-body text-danger-700">
              {classifyError(profileQuery.error).message}
            </p>
            <Button
              variant="secondary"
              block
              onClick={() => void profileQuery.refetch()}
            >
              다시 시도
            </Button>
          </div>
        </Card>
      ) : profile === undefined || profile === null ? (
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-2">
              <p className="text-h2 text-text">{profile.name}</p>
              <p className="text-body text-text-muted">
                {profile.grade} · 아이디 {profile.loginId}
              </p>
              {profile.classes.length === 0 ? (
                <p className="text-body text-text-muted">
                  아직 배정된 반이 없어요.
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-body text-text">
                  {profile.classes.map((c) => (
                    <li key={c.id}>{c.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <Card title="포인트 내역">
            <PointHistoryList studentId={profile.id} />
          </Card>
        </>
      )}
      <ChangePasswordCard />
      <InstallGuideCard />
      <Button variant="ghost" block onClick={() => void signOut()}>
        로그아웃
      </Button>
    </div>
  );
}
