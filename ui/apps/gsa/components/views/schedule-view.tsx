import type { Schedule } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";
import { SessionCard } from "@/components/session-card";
import { TalkCard } from "@/components/talk-card";

/** The guest's starred sessions, then starred presentations; with none, how to add some. */
export function ScheduleView({ schedule }: { schedule: Schedule }) {
  const t = useTranslations("schedule");
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      {schedule.talks.length + schedule.sessions.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
      {schedule.sessions.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("sessions")}</h2>
          <div className="space-y-2">
            {schedule.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}
      {schedule.talks.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("talks")}</h2>
          <div className="space-y-2">
            {schedule.talks.map((talk) => (
              <TalkCard key={talk.id} talk={talk} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
