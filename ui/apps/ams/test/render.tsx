import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { TimeZoneProvider } from "@/shared/meeting-time";
import { MEETING_ZONE } from "@/shared/app";
import messages from "@/shared/text/en.json";

/** Renders as the app does: English messages, meeting time, the real time-zone switch. A missing message key fails the test. No tRPC, on purpose. The providers stay when a test re-renders. */
export function renderApp(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone={MEETING_ZONE}
        onError={(error) => {
          throw error;
        }}
      >
        <TimeZoneProvider>{children}</TimeZoneProvider>
      </NextIntlClientProvider>
    ),
  });
}
