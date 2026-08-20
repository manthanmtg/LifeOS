import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteData } from "@/lib/public-data";
import ResumeViewer from "./ResumeViewer";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteData();
  return { title: `${site.userName} Resume` };
}

export default async function ResumePage() {
  const site = await getPublicSiteData();
  if (!site.resumeAvailable) notFound();
  return <ResumeViewer />;
}
