import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import styles from "./portfolio.module.css";

export interface PortfolioProfile {
  full_name?: string;
  hero_title: string;
  sub_headline?: string;
  bio?: string;
  skills: string[];
  social_links: { platform: string; url: string }[];
  available_for_hire: boolean;
}

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

export default function PortfolioShowcase({
  profile,
  resumeAvailable = false,
}: {
  profile: PortfolioProfile;
  resumeAvailable?: boolean;
}) {
  const name = profile.full_name?.trim();
  const headline = profile.hero_title?.trim() || name || "Life OS";
  const subHeadline = profile.sub_headline?.trim();
  const bio = profile.bio?.trim();
  const skills = (profile.skills || [])
    .map((skill) => skill.trim())
    .filter(Boolean);
  const socialLinks = (profile.social_links || [])
    .filter((link) => link?.platform?.trim() && link.url?.trim())
    .map(({ platform, url }) => ({
      platform: platform.trim(),
      url: url.trim(),
    }));
  const [primaryContact, ...otherLinks] = socialLinks;

  const sections = [
    ...(bio ? [{ id: "about", label: "About" }] : []),
    ...(skills.length ? [{ id: "skills", label: "Skills" }] : []),
    ...(primaryContact ? [{ id: "contact", label: "Contact" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 md:pb-24">
      <section className={styles.hero} aria-labelledby="portfolio-title">
        <div className="min-w-0">
          {(profile.available_for_hire || (name && name !== headline)) && (
            <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mb-8">
              {name && name !== headline && (
                <p className="font-mono text-xs font-medium tracking-wider text-zinc-300 [overflow-wrap:anywhere]">
                  {name}
                </p>
              )}
              {profile.available_for_hire && (
                <p className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-success"
                  />
                  Open to new projects
                </p>
              )}
            </div>
          )}

          <h1 id="portfolio-title" className={styles.title}>
            {headline}
          </h1>

          {subHeadline && (
            <p className="mt-5 max-w-[37ch] text-lg leading-relaxed text-zinc-300 [overflow-wrap:anywhere] sm:mt-6 sm:text-xl">
              {subHeadline}
            </p>
          )}

          {(resumeAvailable || primaryContact) && (
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
              {resumeAvailable && (
                <a
                  href="/resume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-12 items-center gap-3 rounded-full bg-zinc-50 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 ${focus}`}
                >
                  View Résumé
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                </a>
              )}
              {primaryContact && (
                <a
                  href="#contact"
                  className={`inline-flex min-h-12 items-center gap-3 rounded-full border border-zinc-700 px-5 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-400 hover:bg-zinc-900 ${focus}`}
                >
                  Contact
                  <ArrowDown aria-hidden="true" className="size-4 shrink-0" />
                </a>
              )}
            </div>
          )}
        </div>

        <div className={styles.artwork} aria-hidden="true">
          <Image
            src="/portfolio/hero-sculpture.webp"
            alt=""
            fill
            sizes="(min-width: 1152px) 500px, (min-width: 900px) 43vw, (min-width: 640px) 65vw, 92vw"
            fetchPriority="high"
            loading="eager"
            className="object-cover"
          />
        </div>
      </section>

      {sections.length > 0 && (
        <nav
          aria-label="Portfolio sections"
          className="border-y border-zinc-800"
        >
          <ul className="flex flex-wrap gap-x-6 py-1 sm:gap-x-9">
            {sections.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`inline-flex min-h-11 items-center gap-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-50 ${focus}`}
                >
                  {label}
                  <ArrowDown aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {bio && (
        <section
          id="about"
          aria-labelledby="portfolio-about"
          className={styles.detail}
        >
          <h2 id="portfolio-about" className={styles.sectionTitle}>
            About
          </h2>
          <p className="max-w-[60ch] font-serif text-xl leading-relaxed whitespace-pre-wrap text-zinc-100 [overflow-wrap:anywhere] sm:text-2xl">
            {bio}
          </p>
        </section>
      )}

      {skills.length > 0 && (
        <section
          id="skills"
          aria-labelledby="portfolio-skills"
          className={styles.detail}
        >
          <h2 id="portfolio-skills" className={styles.sectionTitle}>
            Skills
          </h2>
          <ul className="flex flex-wrap items-start gap-2.5">
            {skills.map((skill, index) => (
              <li
                key={`${skill}-${index}`}
                className="max-w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 [overflow-wrap:anywhere] sm:px-5 sm:py-3"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}

      {primaryContact && (
        <section
          id="contact"
          aria-labelledby="portfolio-contact"
          className={styles.contact}
        >
          <div className="min-w-0">
            <h2
              id="portfolio-contact"
              className="text-4xl leading-tight font-semibold tracking-[-0.055em] text-zinc-50 sm:text-5xl"
            >
              Let&apos;s connect.
            </h2>
            <a
              href={primaryContact.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group mt-3 inline-flex min-h-11 items-center gap-3 text-base font-medium text-zinc-100 underline decoration-zinc-400 underline-offset-6 [overflow-wrap:anywhere] transition-colors hover:decoration-accent ${focus}`}
            >
              Get in touch on {primaryContact.platform}
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-1"
              />
            </a>
            {otherLinks.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-x-5">
                {otherLinks.map(({ platform, url }, index) => (
                  <li key={`${platform}-${index}`} className="min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-50 ${focus}`}
                    >
                      <span className="[overflow-wrap:anywhere]">
                        {platform}
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ArrowUpRight
            aria-hidden="true"
            strokeWidth={0.75}
            className={styles.contactMark}
          />
        </section>
      )}
    </div>
  );
}
