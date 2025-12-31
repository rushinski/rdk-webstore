import Link from 'next/link';
import { ContactForm } from '@/components/contact/ContactForm';

export default function BugReportPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-4">Report a bug</h1>
        <p className="text-zinc-400">
          Found something off? Tell us what happened and where it happened. Screenshots are welcome.
        </p>
      </div>

      <div className="max-w-2xl">
        <ContactForm
          source="bug_report"
          initialSubject="Bug report"
          messagePlaceholder="Share the steps, where it happened, and what you expected to see."
        />
      </div>

      <p className="text-zinc-500 text-sm mt-6">
        Prefer the regular contact page?{" "}
        <Link href="/contact" className="text-red-400 hover:underline">
          Contact us here
        </Link>
        .
      </p>
    </div>
  );
}
