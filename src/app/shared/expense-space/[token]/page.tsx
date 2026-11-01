import type { Metadata } from "next";
import SharedExpenseSpace from "@/modules/expense-spaces/components/SharedExpenseSpace";
import { resolveShare } from "@/lib/expense-spaces/public-share";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  let title = "Shared expense space";
  try {
    const share = await resolveShare(token);
    if (share?.space.name) title = share.space.name;
  } catch {
    // The page will show its own unavailable state if the share cannot load.
  }
  const description = "View the shared expense ledger, budget and documents.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedExpenseSpace token={token} />;
}
