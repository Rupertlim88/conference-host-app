import { NotFoundView } from "@/components/views/not-found-view";

/** An address that matches no page: shown without the app's frame, so it is the page's main region. */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <NotFoundView />
    </main>
  );
}
