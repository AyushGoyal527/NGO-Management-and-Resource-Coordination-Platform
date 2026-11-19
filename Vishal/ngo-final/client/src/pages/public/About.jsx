import { usePageTitle } from "../../context/SiteContext";
import { imageSrc } from "../../services/websiteApi";
import {
  Note,
  PageTop,
  Section,
  SiteGate,
  Stories,
  Testimonials,
  Wrap,
} from "../../components/site";

export default function About() {
  usePageTitle("About us");
  return (
    <SiteGate>
      {(site) => {
        const { about, mission, stories, testimonials } = site.sections;
        return (
          <>
            <PageTop
              title={about?.title || `About ${site.organization.name}`}
              intro={site.organization.tagline}
            />
            {!about && !mission && (
              <Wrap className="py-16">
                <Note
                  title="Our story is coming soon"
                  hint="Please check back later."
                />
              </Wrap>
            )}
            {about && (
              <Section>
                <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
                  <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed text-slate-700">
                    {about.text}
                  </p>
                  {about.image && (
                    <img
                      src={imageSrc(about.image)}
                      alt=""
                      className="w-full rounded-xl object-cover"
                    />
                  )}
                </div>
              </Section>
            )}
            {mission && (
              <Section title="Mission and vision" tone="leaf">
                <div className="grid gap-8 md:grid-cols-2">
                  {mission.text && (
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">
                        Mission
                      </h3>
                      <p className="mt-2 leading-relaxed text-slate-700">
                        {mission.text}
                      </p>
                    </div>
                  )}
                  {mission.vision && (
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">
                        Vision
                      </h3>
                      <p className="mt-2 leading-relaxed text-slate-700">
                        {mission.vision}
                      </p>
                    </div>
                  )}
                </div>
              </Section>
            )}
            {stories && (
              <Section title="Stories from the field">
                <Stories items={stories.items} />
              </Section>
            )}
            {testimonials && (
              <Section title="In their words" tone="leaf">
                <Testimonials items={testimonials.items} />
              </Section>
            )}
          </>
        );
      }}
    </SiteGate>
  );
}
