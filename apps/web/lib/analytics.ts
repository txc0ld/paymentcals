import { createAnalytics, noopProvider, plausibleProvider } from "@paymentcalcs/analytics-safe";

/** All product analytics flow through the §18.4 redaction wrapper. */
export const analytics = createAnalytics(
  typeof window === "undefined" ? noopProvider() : plausibleProvider(),
  process.env.NODE_ENV !== "production"
    ? (rejection) => {
        console.warn(
          `[analytics-safe] dropped "${rejection.event}" (${rejection.reason}${rejection.propertyKey ? `: ${rejection.propertyKey}` : ""})`,
        );
      }
    : undefined,
);
