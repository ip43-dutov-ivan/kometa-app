"use client";

import { useEffect } from "react";

function shouldUseMocks(): boolean {
  const setting = process.env.NEXT_PUBLIC_KOMETA_API_MOCKING;

  return setting === "true";
}

export function MockServiceWorker() {
  useEffect(() => {
    if (!shouldUseMocks()) {
      navigator.serviceWorker
        ?.getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations
              .filter((registration) =>
                registration.active?.scriptURL.endsWith("/mockServiceWorker.js"),
              )
              .map((registration) => registration.unregister()),
          ),
        );
      return;
    }

    async function startWorker() {
      const { worker } = await import("./browser");
      await worker.start({
        onUnhandledRequest: "bypass",
        serviceWorker: {
          url: "/mockServiceWorker.js",
        },
      });
    }

    startWorker();
  }, []);

  return null;
}
