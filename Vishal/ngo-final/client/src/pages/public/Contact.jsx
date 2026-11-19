import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { usePageTitle } from "../../context/SiteContext";
import { Note, PageTop, SiteGate, Wrap } from "../../components/site";

const Row = ({ icon: Icon, title, children }) => (
  <li className="flex gap-4 py-4">
    <Icon
      className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
      aria-hidden="true"
    />
    <div>
      <p className="text-sm text-slate-500">{title}</p>
      <div className="font-medium text-slate-900">{children}</div>
    </div>
  </li>
);

export default function Contact() {
  usePageTitle("Contact");
  return (
    <SiteGate>
      {({ organization: o, sections }) => {
        const c = sections.contact || {};
        const any = o.email || o.phone || o.address || c.hours || c.mapUrl;
        return (
          <>
            <PageTop
              title="Contact us"
              intro={c.text || "We would be glad to hear from you."}
            />
            <Wrap className="py-10 sm:py-14">
              {!any ? (
                <Note title="Contact details are coming soon" />
              ) : (
                <ul className="max-w-xl divide-y divide-slate-200 border-y border-slate-200">
                  {o.address && (
                    <Row icon={MapPin} title="Address">
                      <span className="whitespace-pre-line">{o.address}</span>
                    </Row>
                  )}
                  {o.phone && (
                    <Row icon={Phone} title="Phone">
                      <a
                        className="hover:underline"
                        href={`tel:${o.phone.replace(/[^\d+]/g, "")}`}
                      >
                        {o.phone}
                      </a>
                    </Row>
                  )}
                  {o.email && (
                    <Row icon={Mail} title="Email">
                      <a
                        className="break-all hover:underline"
                        href={`mailto:${o.email}`}
                      >
                        {o.email}
                      </a>
                    </Row>
                  )}
                  {c.hours && (
                    <Row icon={Clock} title="Opening hours">
                      {c.hours}
                    </Row>
                  )}
                  {c.mapUrl && (
                    <Row icon={ExternalLink} title="Find us">
                      <a
                        className="text-brand-700 hover:underline"
                        href={c.mapUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Open in maps
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Row>
                  )}
                </ul>
              )}
            </Wrap>
          </>
        );
      }}
    </SiteGate>
  );
}
