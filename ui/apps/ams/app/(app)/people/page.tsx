import { PeopleView } from "@/features/people";
import { firstParam } from "@/features/app";
import { serverApi } from "@/features/server";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ letter?: string | string[] }> }) {
  const letter = firstParam((await searchParams).letter);
  const people = await (await serverApi()).people.list();
  return <PeopleView people={people} letter={letter || undefined} />;
}
