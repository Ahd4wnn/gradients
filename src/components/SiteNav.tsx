import Link from "next/link";
import { Suspense } from "react";
import { getAccount } from "@/lib/server/account";

export function Logo() {
  return (
    <Link href="/" className="font-medium tracking-tight">
      gradients <span className="text-white/60">by f13s</span>
    </Link>
  );
}

const pill = "rounded-full px-4 py-2 text-sm font-medium";

/** The right-hand side of the nav depends on the session, so it streams in; the rest of the page does not wait. */
async function AccountLinks() {
  const account = await getAccount();
  if (account?.pro)
    return (
      <>
        <Link href="/account" className={`${pill} hidden text-white/70 hover:text-white sm:block`}>Account</Link>
        <Link href="/studio" className={`${pill} bg-white text-black hover:bg-white/80`}>Open studio</Link>
      </>
    );
  return (
    <>
      <Link href={account ? "/account" : "/signin"} className={`${pill} text-white/70 hover:text-white`}>{account ? "Account" : "Sign in"}</Link>
      <Link href={account ? "/checkout" : "/signup?next=/checkout"} className={`${pill} bg-white text-black hover:bg-white/80`}>Get lifetime access</Link>
    </>
  );
}

export function SiteNav({ links = true }: { links?: boolean }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 top-4 z-20 mx-auto flex w-[min(64rem,calc(100%-2rem))] items-center justify-between gap-2 rounded-full bg-black/40 p-2 pl-5 text-sm ring-1 ring-white/10 backdrop-blur-xl">
      <Logo />
      {links && (
        <div className="hidden items-center md:flex">
          {[["#features", "Features"], ["#gallery", "Gallery"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
            <Link key={href} href={`/${href}`} className={`${pill} text-white/70 hover:text-white`}>{label}</Link>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        {/* same width as the signed-out buttons, so the bar does not jump when the real links arrive */}
        <Suspense fallback={<span className={`${pill} invisible`}>Get lifetime access</span>}>
          <AccountLinks />
        </Suspense>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto grid max-w-6xl gap-10 px-4 py-16 text-sm text-white/60 sm:grid-cols-[2fr_1fr_1fr]">
      <div className="space-y-3">
        <p className="text-white"><Logo /></p>
        <p className="max-w-xs">Gradients for the apps your agent builds. Edit in the studio, export up to 4K, or embed with one line.</p>
        <p>© {2026} gradients by f13s</p>
      </div>
      <div className="space-y-2">
        <p className="font-medium text-white">Product</p>
        <Link href="/#features" className="block hover:text-white">Features</Link>
        <Link href="/#gallery" className="block hover:text-white">Gallery</Link>
        <Link href="/#pricing" className="block hover:text-white">Pricing</Link>
        <Link href="/studio" className="block hover:text-white">Studio</Link>
      </div>
      <div className="space-y-2">
        <p className="font-medium text-white">Legal</p>
        <Link href="/terms" className="block hover:text-white">Terms</Link>
        <Link href="/privacy" className="block hover:text-white">Privacy</Link>
        <Link href="/refunds" className="block hover:text-white">Refunds</Link>
      </div>
    </footer>
  );
}
