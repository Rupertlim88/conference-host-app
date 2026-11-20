import { PersonView } from "@/components/views/person-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await orNotFound((await serverApi()).people.get({ id }));
  return <PersonView person={person} />;
}
