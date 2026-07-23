import posthog from "posthog-js";

let started = false;

export function initAnalytics() {
  if (started || !import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.posthog.com",
    capture_pageview: true,
    persistence: "localStorage+cookie",
  });
  started = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!started) return;
  posthog.capture(event, props);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!started) return;
  posthog.identify(userId, traits);
}
