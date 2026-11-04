/** 숫자만 남겨 9~11자리이고 0으로 시작할 때만 tel: 링크를 돌려줘요. */
export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return /^0\d{8,10}$/.test(digits) ? `tel:${digits}` : null;
}
