export function ComingSoonScreen({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-serif text-h2 text-text">{title}</h1>
      <p className="text-body text-text-muted">
        {title} 화면은 준비 중이에요. 다음 업데이트에서 열려요.
      </p>
    </div>
  );
}
