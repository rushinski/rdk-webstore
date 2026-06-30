export default function HoursPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-8 md:px-12 lg:px-16">
      <h1 className="mb-4 text-4xl font-bold text-brand-text">Hours</h1>
      <p className="mb-4 text-brand-muted">
        Pickup and meetup are available in Simpsonville, South Carolina. Local pickup can
        be selected at checkout.
      </p>
      <p className="mb-10 text-brand-muted">
        We are always looking to buy sneakers no matter the condition or quantity. If you
        are interested in selling, email us at{" "}
        <a href="mailto:null@gmail.com" className="text-brand-text hover:underline">
          null@gmail.com
        </a>{" "}
        or submit through the{" "}
        <a href="/contact" className="text-brand-text hover:underline">
          contact form
        </a>
        .
      </p>

      <div className="grid items-stretch gap-8 md:grid-cols-2">
        <div className="flex h-full min-h-[360px] flex-col border border-brand-border bg-brand-surface p-8">
          <h2 className="mb-4 text-2xl font-bold text-brand-text">Business Hours</h2>
          <p className="mb-6 text-brand-muted">
            We offer local pickups and meetups by appointment.
          </p>
          <div className="space-y-2 text-brand-muted">
            <div className="flex justify-between">
              <span>Monday</span>
              <span>11:00 AM - 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Tuesday</span>
              <span>11:00 AM - 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Wednesday</span>
              <span>11:00 AM - 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Thursday</span>
              <span>11:00 AM - 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Friday</span>
              <span>11:00 AM - 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Saturday</span>
              <span>11:00 AM - 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Sunday</span>
              <span>Closed</span>
            </div>
          </div>
        </div>

        <div className="h-full min-h-[360px] overflow-hidden border border-brand-border bg-brand-surface">
          <iframe
            title="Map of Simpsonville, South Carolina"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-82.3326%2C34.6985%2C-82.1687%2C34.7876&layer=mapnik&marker=34.743%2C-82.2507"
            width="100%"
            height="360"
            style={{ border: 0 }}
            loading="lazy"
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
