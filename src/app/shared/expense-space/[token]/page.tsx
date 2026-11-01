import type { Metadata } from "next";
import SharedExpenseSpace from "@/modules/expense-spaces/components/SharedExpenseSpace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shared expense space",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedExpenseSpace token={token} />;
}
