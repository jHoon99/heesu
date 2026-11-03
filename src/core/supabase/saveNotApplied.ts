/** 수정·삭제가 오류 없이 0행에 적용됐을 때(RLS 차단·없는 id) 던져요. */
export class SaveNotAppliedError extends Error {
  constructor() {
    super("저장하지 못했어요. 다시 로그인하거나 새로고침해 주세요.");
    this.name = "SaveNotAppliedError";
  }
}
