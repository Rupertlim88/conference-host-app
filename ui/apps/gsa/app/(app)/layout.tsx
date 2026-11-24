import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { serverApi } from "@/lib/server-api";

// Every page here needs a signed-in person: serverApi() redirects to sign-in, and the backend checks again on every call.
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const meeting = await (await serverApi()).meeting.get();
  return (
    <AppShell meeting={meeting} signOut={<SignOutButton />}>
      {children}
    </AppShell>
  );
}
