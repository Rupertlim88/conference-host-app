import { PersonView } from "@/base/people";
import { orNotFound, serverApi } from "@/shared/server";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await orNotFound((await serverApi()).people.get({ id }));
  return <PersonView person={person} />;
}
