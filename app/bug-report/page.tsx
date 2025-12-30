import Link from 'next/link';
import { ContactForm } from '@/components/contact/ContactForm';

export default function BugReportPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Report a bug</p>
        <h1 className="text-4xl font-bold text-white mt-4">Found something off?</h1>
        <p className="text-zinc-400 mt-4 max-w-2xl">
          Tell us what happened, where it happened, and what you expected to see. Screenshots help a lot.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <ContactForm
          source="bug_report"
          initialSubject="Bug report"
          initialMessage="Page or feature:\nWhat happened:\nWhat you expected:\n"
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
