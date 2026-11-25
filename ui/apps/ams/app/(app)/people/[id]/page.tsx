import { PersonView } from "@/features/people";
import { orNotFound, serverApi } from "@/features/server";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await orNotFound((await serverApi()).people.get({ id }));
  return <PersonView person={person} />;
}
