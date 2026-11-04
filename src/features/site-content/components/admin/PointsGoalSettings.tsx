"use client";

import { EditableLoader } from "./EditableLoader";
import { PointsGoalEditor } from "./PointsGoalEditor";

/** 포인트 화면에 두는 보상 목표 카드예요. */
export function PointsGoalSettings() {
  return (
    <EditableLoader>
      {(e) => <PointsGoalEditor initial={e.pointsGoal} />}
    </EditableLoader>
  );
}
