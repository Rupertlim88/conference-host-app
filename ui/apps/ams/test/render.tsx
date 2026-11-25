import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { TimeZoneProvider } from "@/features/meeting-time";
import { MEETING_ZONE } from "@/features/app";
import messages from "@/features/text/en.json";

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
