import Link from 'next/link'

export function LegalFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-4 text-xs text-gray-400 sm:flex-row sm:justify-between sm:gap-0">
        <span>© 2025 Charlotte Chinese Academy. All rights reserved.</span>
        <span className="hidden sm:block">Developed by Charlotte Chinese Academy</span>
        <div className="flex items-center gap-3">
          <Link href="/privacy-policy" className="hover:text-gray-600 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/terms-of-use" className="hover:text-gray-600 transition-colors">
            Terms of Use
          </Link>
        </div>
      </div>
      <p className="block pb-3 text-center text-xs text-gray-300 sm:hidden">
        Developed by Charlotte Chinese Academy
      </p>
    </footer>
  )
}
