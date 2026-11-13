import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Shell, Wait } from "@/components/Shell";
import { getAccount } from "@/lib/server/account";
import { safeNext } from "@/lib/validate";

export const metadata = { title: "Create your account · gradients by f13s" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/checkout");
  if (await getAccount()) redirect(next);
  return <AuthForm mode="signup" next={next} />;
}

export default function Page({ searchParams }: PageProps<"/signup">) {
  return (
    <Shell title={<>Create your <em className="font-serif">account</em></>} subtitle="Then pay once for lifetime access to the studio.">
      <Suspense fallback={<Wait />}>
        <Form searchParams={searchParams as Promise<{ next?: string }>} />
      </Suspense>
    </Shell>
  );
}
