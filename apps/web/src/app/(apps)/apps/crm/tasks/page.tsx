// Re-export the real page — avoids the redirect loop that existed when this
// stub redirected to a flat URL that middleware would redirect back here.
export { default } from '../../../../(dashboard)/tasks/page'
