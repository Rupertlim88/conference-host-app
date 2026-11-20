"use client";

import type { Target } from "@repo/host-contracts";

import { trpc } from "@/lib/trpc";

import { StarToggle } from "./star-toggle";

/** The star, wired to the backend. Starring refreshes both the star list and My Schedule. */
export function StarButton({ target }: { target: Target }) {
  const utils = trpc.useUtils();
  const starred = trpc.schedule.starred.useQuery();
  const done = () => Promise.all([utils.schedule.starred.invalidate(), utils.schedule.get.invalidate()]);
  const star = trpc.schedule.star.useMutation({ onSuccess: done });
  const unstar = trpc.schedule.unstar.useMutation({ onSuccess: done });
  return (
    <StarToggle
      target={target}
      starred={starred.data}
      busy={star.isPending || unstar.isPending}
      onStar={(t) => star.mutate(t)}
      onUnstar={(t) => unstar.mutate(t)}
    />
  );
}
