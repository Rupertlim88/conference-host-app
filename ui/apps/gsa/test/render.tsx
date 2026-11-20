import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { TimeZoneProvider } from "@/components/time-zone";
import { MEETING_ZONE } from "@/lib/meeting";
import messages from "@/messages/en.json";

/** Renders as the app does: English messages, meeting time, the real time-zone switch. A missing message key fails the test. No tRPC, on purpose. */
export function renderApp(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone={MEETING_ZONE}
      onError={(error) => {
        throw error;
      }}
    >
      <TimeZoneProvider>{ui}</TimeZoneProvider>
    </NextIntlClientProvider>,
  );
}
