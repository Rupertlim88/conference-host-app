import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { serverApi } from "@/lib/server-api";

// Every page here needs a signed-in person: serverApi() redirects to sign-in, and the backend checks again on every call.
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const api = await serverApi();
  const [meeting, { verifyUrl }] = await Promise.all([api.meeting.get(), api.settings.get()]);
  return (
    <AppShell meeting={meeting} verifyUrl={verifyUrl} signOut={<SignOutButton />}>
      {children}
    </AppShell>
  );
}
