import { ContactForm } from "@/components/contact/ContactForm";

export default function BugReportPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-16">
      <div className="mb-10 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Report a bug</h1>
        <p className="text-zinc-400">
          Found something off? Tell us what happened and where it happened. Screenshots
          are helpful. Thank you for helping us improve the Realdealkickzsc platform.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <ContactForm
          source="bug_report"
          initialSubject="Bug report"
          messagePlaceholder="Share the steps, where it happened, and what you expected to see."
        />
      </div>
    </div>
  );
}
