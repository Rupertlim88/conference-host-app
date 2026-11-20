import { NotFoundView } from "@/components/views/not-found-view";

/** An unknown id inside the app: shown in the frame's main region, so it has none of its own. */
export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <NotFoundView />
    </div>
  );
}
