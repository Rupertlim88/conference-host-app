import { PeopleView } from "@/base/people";
import { firstParam } from "@/shared/app";
import { serverApi } from "@/shared/server";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ letter?: string | string[] }> }) {
  const letter = firstParam((await searchParams).letter);
  const people = await (await serverApi()).people.list();
  return <PeopleView people={people} letter={letter || undefined} />;
}
