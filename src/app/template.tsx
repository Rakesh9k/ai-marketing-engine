/** Re-mounts on every navigation, replaying a CSS-only entrance (no hydration dependency). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
