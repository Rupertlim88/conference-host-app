import { cn } from "@/lib/utils";

/** The consoles' dense table: one line a row, a header row of column names. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-100 text-xs text-neutral-700 uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-2 py-1.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn("px-2 py-1.5 align-top", className)}>{children}</td>;
}
