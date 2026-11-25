import { AppShell } from "@/features/frame";
import { SignOutButton } from "@/features/sign-in";
import { serverApi } from "@/features/server";

// Every page here needs a signed-in person: serverApi() redirects to sign-in, and the backend checks again on every call.
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const meeting = await (await serverApi()).meeting.get();
  return (
    <AppShell meeting={meeting} signOut={<SignOutButton />}>
      {children}
    </AppShell>
  );
}
