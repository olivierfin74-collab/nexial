// Production URL for the sniper surface validated in the preview lab.
// Re-exports the same Next.js client page exported by
// /mobile-v3-preview/sniper so the v3 product surface is reachable from
// the mobile bottom nav under a clean /sniper URL. The preview path
// stays around for UX iteration without polluting production traffic.

export { default } from '../mobile-v3-preview/sniper/page'
