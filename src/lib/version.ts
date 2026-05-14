// Mobile shell version surfaced on /mobile.
//
// MOBILE_VERSION is bumped manually when shipping a new mobile UX cut.
// MOBILE_BUILD_SHA is injected at build time by next.config.ts from
// VERCEL_GIT_COMMIT_SHA — see https://vercel.com/docs/projects/environment-variables/system-environment-variables.
// Local dev shows "local".

export const MOBILE_VERSION = 'v3.0.6'

export const MOBILE_BUILD_SHA: string =
  (process.env.NEXT_PUBLIC_BUILD_SHA as string | undefined) ?? 'local'

export function formatMobileVersion(): string {
  if (!MOBILE_BUILD_SHA || MOBILE_BUILD_SHA === 'local') return MOBILE_VERSION
  return `${MOBILE_VERSION} · ${MOBILE_BUILD_SHA}`
}
