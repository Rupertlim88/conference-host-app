// One gold outline, with its label, is drawn the same way for every change.

/** What a version changed, in a gold outline, with a label on its top edge saying what changed; empty with nothing to show. */
export function GoldOutline({ label, children }: { label: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="mt-4 mb-5 rounded-md border-2 border-amber-400 px-3 pb-3">
      {/* Shifted onto the top edge but kept in the flow, so a label that wraps on a phone pushes the change down. */}
      <span className="relative -top-3 -mb-1 inline-block rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">{label}</span>
      {children}
    </section>
  );
}
