import { AppShell } from "@/base/frame";
import { SignOutButton } from "@/shared/sign-in";
import { serverApi } from "@/shared/server";
import { chosenVersion } from "@/versions/change";

// Every page here needs a signed-in person: serverApi() redirects to sign-in, and the backend checks again on every call.
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const meeting = await (await serverApi()).meeting.get();
  return (
    <AppShell meeting={meeting} version={await chosenVersion()} signOut={<SignOutButton />}>
      {children}
    </AppShell>
  );
}
