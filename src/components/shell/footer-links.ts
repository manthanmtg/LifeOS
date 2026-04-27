export interface SocialLink {
  platform: string;
  url: string;
}

export function getRenderableSocialLinks(links: SocialLink[]) {
  return links.filter((link) => link.platform && link.url);
}
