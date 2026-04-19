export function isLaunchMode(): boolean {
  return process.env.NEXT_PUBLIC_LAUNCH_MODE !== 'false'
}
