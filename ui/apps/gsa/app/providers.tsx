"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";

import { TimeZoneProvider } from "@/components/time-zone";
import { trpc } from "@/lib/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  const [trpcClient] = useState(() => trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc" })] }));
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TimeZoneProvider>{children}</TimeZoneProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
