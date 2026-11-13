import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAccount } from "@/lib/server/account";
import StudioLoader from "./StudioLoader";

export const metadata = { title: "Studio · gradients by f13s" };

/** The studio is the paid product: signed in and licensed, or sent to sign in / checkout with the way back kept. */
async function Gate({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const here = typeof g === "string" ? `/studio?g=${encodeURIComponent(g)}` : "/studio";
  const account = await getAccount();
  if (!account) redirect(`/signin?next=${encodeURIComponent(here)}`);
  if (!account.pro) redirect(`/checkout?next=${encodeURIComponent(here)}`);
  return <StudioLoader />;
}

export default function Page({ searchParams }: PageProps<"/studio">) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-ink" />}>
      <Gate searchParams={searchParams as Promise<{ g?: string }>} />
    </Suspense>
  );
}
