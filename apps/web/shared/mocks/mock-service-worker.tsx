"use client";

import { useEffect } from "react";

function shouldUseMocks(): boolean {
  const setting = process.env.NEXT_PUBLIC_KOMETA_API_MOCKING;

  if (setting === "false") {
    return false;
  }

  if (setting === "true") {
    return true;
  }

  return process.env.NODE_ENV === "development";
}

export function MockServiceWorker() {
  useEffect(() => {
    if (!shouldUseMocks()) {
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
