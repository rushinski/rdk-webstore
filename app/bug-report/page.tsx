import { ContactForm } from "@/components/contact/ContactForm";

export default function BugReportPage() {
  return (
    <div className="mx-auto max-w-brand px-6 pb-16 pt-8 md:px-12 lg:px-16">
      <div className="mx-auto mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-brand-muted">Support</p>
        <h1 className="mb-4 mt-3 text-4xl font-black uppercase tracking-[0.08em] text-brand-text">
          Report a bug
        </h1>
        <p className="text-brand-muted">
          Found something off? Tell us what happened and where it happened. Screenshots
          are helpful. Thank you for helping us improve the solesneakers storefront.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <ContactForm
          source="bug_report"
          initialSubject="Bug report"
          messagePlaceholder="Share the steps, where it happened, and what you expected to see."
        />
      </div>
    </div>
  );
}
