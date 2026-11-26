// The gold outline and label that every change of our versions shows in.

/** What a version changed, in a gold outline, with a label on its top edge saying what changed. */
export function GoldOutline({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="relative mt-4 mb-5 rounded-md border-2 border-amber-400 px-3 pt-5 pb-3">
      <span className="absolute -top-3 left-3 rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">{label}</span>
      {children}
    </section>
  );
}
