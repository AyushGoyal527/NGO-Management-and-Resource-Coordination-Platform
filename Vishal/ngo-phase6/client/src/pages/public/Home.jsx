import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { usePageTitle } from '../../context/SiteContext';
import { publicApi, imageSrc } from '../../services/websiteApi';
import { num } from '../../utils/format';
import { Arch, EventRows, LinkButton, ProgramList, Section, SiteGate, Stories, Testimonials, Wrap } from '../../components/site';

const loadPrograms = () => publicApi.programs();
const loadEvents = () => publicApi.events({ when: 'upcoming', limit: 3 });

function Hero({ site }) {
  const hero = site.sections.hero || {};
  const org = site.organization;
  const images = hero.images || [];
  const [i, setI] = useState(0);
  const current = images[i];
  return (
    <section aria-labelledby="hero-h" className="overflow-hidden bg-brand-50">
      <Wrap className="grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 id="hero-h" className="font-display text-4xl font-semibold leading-[1.1] text-ink sm:text-6xl">{hero.title || org.name}</h1>
          {(hero.description || org.tagline) && <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700">{hero.description || org.tagline}</p>}
          <div className="mt-8 flex flex-wrap gap-3"><LinkButton to="/donate" variant="sun">Donate</LinkButton><LinkButton to="/volunteer" variant="secondary">Volunteer with us</LinkButton></div>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -right-6 -top-8 h-44 w-44 sm:-right-10 sm:h-56 sm:w-56" aria-hidden="true">
            <div className="sun-rise h-full w-full rounded-full bg-sun-500" />
          </div>
          <Arch src={current?.url} alt={current?.alt || ''} className="relative aspect-[4/5] w-full shadow-xl ring-8 ring-brand-50" />
          {images.length > 1 && (
            <div className="relative mt-4 flex justify-center gap-2" role="group" aria-label="Choose a photo">
              {images.map((img, n) => <button key={n} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-pressed={n === i} className={`h-12 w-12 overflow-hidden rounded-full border-2 ${n === i ? 'border-sun-500' : 'border-white'}`}><img src={imageSrc(img.url)} alt="" className="h-full w-full object-cover" /></button>)}
            </div>
          )}
        </div>
      </Wrap>
    </section>
  );
}

function Stats({ stats }) {
  return (
    <section aria-label="Our impact" className="bg-ink text-white">
      <Wrap>
        <dl className="grid grid-cols-2 gap-y-8 py-10 md:grid-cols-4">
          {stats.items.map((s, n) => (
            <div key={n} className="px-4 md:border-l md:border-white/20 md:first:border-l-0">
              <dd className="font-display text-4xl font-semibold text-sun-400">{num(s.value)}</dd>
              <dt className="mt-1 text-sm text-slate-300">{s.label}</dt>
            </div>
          ))}
        </dl>
      </Wrap>
    </section>
  );
}

function Live({ loader, title, intro, id, tone, to, linkText, render }) {
  const { data, loading, error } = useFetch(loader);
  if (loading || error || !render(data)) return null; // shown only once there is something to show, so an empty section never flashes in and out
  return (
    <Section id={id} title={title} intro={intro} tone={tone} action={<Link className="font-medium text-brand-700 hover:underline" to={to}>{linkText}</Link>}>
      {render(data)}
    </Section>
  );
}

export default function Home() {
  usePageTitle('');
  return (
    <SiteGate>{(site) => {
      const { about, mission, stats, cta = {}, stories, testimonials, contact } = site.sections;
      return (
        <>
          <Hero site={site} />
          {stats && <Stats stats={stats} />}
          {about && (
            <Section id="about" title={about.title || `About ${site.organization.name}`}>
              <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
                <div>{about.text && <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed text-slate-700">{about.text}</p>}<Link to="/about" className="mt-5 inline-block font-medium text-brand-700 hover:underline">More about us</Link></div>
                {about.image && <img src={imageSrc(about.image)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />}
              </div>
            </Section>
          )}
          {mission?.text && (
            <section aria-labelledby="mission-h" className="bg-brand-700 py-16 text-white sm:py-24">
              <Wrap><h2 id="mission-h" className="sr-only">Our mission</h2>
                <p className="max-w-4xl font-display text-3xl leading-snug sm:text-4xl">{mission.text}</p>
                {mission.vision && <p className="mt-6 max-w-2xl text-lg text-brand-100"><span className="font-semibold text-white">Our vision: </span>{mission.vision}</p>}</Wrap>
            </section>
          )}
          <Live id="programs" loader={loadPrograms} title="What we do" to="/programs" linkText="All programs" render={(d) => (d?.length ? <ProgramList programs={d.slice(0, 3)} /> : null)} />
          <section aria-label="Ways to help" className="bg-brand-50 py-14 sm:py-20">
            <Wrap className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-sun-500 p-8 text-ink"><h2 className="font-display text-2xl font-semibold">{cta.donateTitle || 'Support our work'}</h2><p className="mt-2 max-w-md leading-relaxed">{cta.donateText || 'Give money, food, clothes, books or medicines.'}</p><div className="mt-6"><Link to="/donate" className="btn bg-ink px-5 py-3 text-base text-white hover:bg-brand-900">Donate</Link></div></div>
              <div className="rounded-2xl bg-brand-600 p-8 text-white"><h2 className="font-display text-2xl font-semibold">{cta.volunteerTitle || 'Volunteer with us'}</h2><p className="mt-2 max-w-md leading-relaxed text-brand-100">{cta.volunteerText || 'Tell us how you would like to help.'}</p><div className="mt-6"><LinkButton to="/volunteer" variant="light">Apply to volunteer</LinkButton></div></div>
            </Wrap>
          </section>
          <Live id="events" loader={loadEvents} title="Coming up" to="/events" linkText="All events" render={(d) => (d?.items?.length ? <EventRows events={d.items} /> : null)} />
          {stories && <Section id="stories" title="Stories from the field" tone="leaf"><Stories items={stories.items} /></Section>}
          {testimonials && <Section id="voices" title="In their words"><Testimonials items={testimonials.items} /></Section>}
          {contact && (
            <Section id="contact" title="Visit or write to us" tone="leaf">
              <p className="max-w-xl text-lg text-slate-700">{contact.text}</p>
              <Link to="/contact" className="mt-4 inline-block font-medium text-brand-700 hover:underline">Contact details</Link>
            </Section>
          )}
        </>
      );
    }}</SiteGate>
  );
}
