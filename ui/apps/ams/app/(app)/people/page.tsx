import { PeopleView } from "@/components/views/people-view";
import { firstParam } from "@/lib/params";
import { serverApi } from "@/lib/server-api";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ letter?: string | string[] }> }) {
  const letter = firstParam((await searchParams).letter);
  const people = await (await serverApi()).people.list();
  return <PeopleView people={people} letter={letter || undefined} />;
}
