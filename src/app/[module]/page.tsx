import PublicModuleClient from "./PublicModuleClient";
import { notFound } from "next/navigation";
import { moduleRegistry } from "@/registry";
import { getPublicContent, getPublicSiteData } from "@/lib/public-data";

export default async function PublicModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const slug = (await params).module;
  const moduleConfig = moduleRegistry[slug];
  if (!moduleConfig) notFound();

  const site = await getPublicSiteData();
  if (!site.publicModules.some((module) => module.slug === slug)) notFound();

  const items = await getPublicContent(moduleConfig.contentType);

  return (
    <PublicModuleClient
      slug={slug}
      userName={site.userName}
      publicModules={site.publicModules}
      socialLinks={site.socialLinks}
      items={items}
    />
  );
}
