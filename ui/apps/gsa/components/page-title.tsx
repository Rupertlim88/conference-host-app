/** A page's one top heading, with an optional line above it naming what the page belongs to. */
export function PageTitle({ eyebrow, children }: { eyebrow?: React.ReactNode; children: React.ReactNode }) {
  return (
    <header className="mb-4 border-b-2 border-neutral-200 pb-3 text-center">
      {eyebrow && <p className="mb-1 text-xs text-muted-foreground">{eyebrow}</p>}
      <h1 className="text-xl leading-snug font-medium text-heading">{children}</h1>
    </header>
  );
}
