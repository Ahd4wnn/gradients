import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Shell, Wait } from "@/components/Shell";
import { getAccount } from "@/lib/server/account";
import { safeNext } from "@/lib/validate";

export const metadata = { title: "Sign in · gradients by f13s" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getAccount()) redirect(next);
  return <AuthForm mode="signin" next={next} />;
}

export default function Page({ searchParams }: PageProps<"/signin">) {
  return (
    <Shell title={<>Welcome <em className="font-serif">back</em></>} subtitle="Sign in to open the studio.">
      <Suspense fallback={<Wait />}>
        <Form searchParams={searchParams as Promise<{ next?: string }>} />
      </Suspense>
    </Shell>
  );
}
