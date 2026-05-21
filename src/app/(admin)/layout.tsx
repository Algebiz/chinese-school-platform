// Route-group layout — intentionally minimal so that admin/ and super-admin/
// can each define their own independent nav/sidebar layout.
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
