import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center mr-3">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-white">
            SwiftShield
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="#how-it-works"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors hidden sm:block"
          >
            How It Works
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
            AI-Powered Parametric Insurance
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 dark:text-white leading-tight mb-6">
            Insurance that pays{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
              instantly
            </span>{" "}
            when you need it
          </h1>

          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            Designed for Blinkit, Zepto, and Swiggy Instamart delivery partners. Get automatic
            payouts for accidents, bad weather, and unforeseen delays. No
            paperwork, no waiting.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-emerald-600 transition-all shadow-lg shadow-blue-500/25"
            >
              Get Started - It&apos;s Free
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              How It Works
            </a>
          </div>
        </div>

        {/* Features */}
        <div
          id="how-it-works"
          className="grid md:grid-cols-3 gap-8 mt-24"
        >
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              Connect Your Account
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Link your Blinkit, Zepto, or Swiggy Instamart delivery account in seconds. We verify
              your rider status automatically.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              AI Monitors Risks
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Our AI tracks weather, traffic, and delivery conditions in
              real-time to assess and respond to risks.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              Instant Payouts
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              When a covered event occurs, get paid automatically to your UPI.
              No claims to file, no waiting period.
            </p>
          </div>
        </div>

        {/* Platform Logos */}
        <div className="mt-24 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            TRUSTED BY DELIVERY PARTNERS FROM
          </p>
          <div className="flex items-center justify-center gap-12">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center mr-2">
                <span className="text-lg font-bold text-zinc-900">B</span>
              </div>
              <span className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                Blinkit
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-2">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <span className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                Zepto
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-2">
                <span className="text-lg font-bold text-white">S</span>
              </div>
              <span className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                Swiggy Instamart
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-24 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#how-it-works" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Account</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/login" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Partners</h4>
              <ul className="space-y-2 text-zinc-500 dark:text-zinc-400">
                <li>Blinkit</li>
                <li>Zepto</li>
                <li>Swiggy Instamart</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-zinc-500 dark:text-zinc-400 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <p>&copy; 2026 SwiftShield. All rights reserved. IRDAI Registered.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
