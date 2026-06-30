import Image from "next/image";

import { ContactForm } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-brand px-6 pb-16 pt-8 md:px-12 lg:px-16">
      <h1 className="mb-4 text-4xl font-bold text-brand-text">Contact</h1>
      <div className="mb-12 space-y-4 text-brand-muted">
        <p>
          Trying to sell sneakers, clothing, accessories, or anything you think we might
          want? Reach out. We&apos;re always buying.
        </p>
        <p>
          You can contact us through{" "}
          <a href="#contact-form" className="text-brand-text hover:underline">
            this contact form
          </a>
          , the{" "}
          <a href="/account" className="text-brand-text hover:underline">
            onsite messaging system
          </a>
          , or by emailing us at{" "}
          <a href="mailto:null@gmail.com" className="text-brand-text hover:underline">
            null@gmail.com
          </a>
          .
        </p>
        <p>
          Need help putting together a fit? Submit your size, style, and any specific
          colors, shoes, or clothing you want included, and we will build a full outfit
          for you.
        </p>
      </div>

      <div className="grid items-stretch gap-12 md:grid-cols-2">
        <div className="h-full">
          <ContactForm source="contact_form" />
        </div>

        <div className="hidden md:block">
          <div className="relative h-full min-h-[420px] overflow-visible">
            <div className="absolute left-[8%] top-[6%] z-20 aspect-[3/4] w-[64%] max-w-[340px] -rotate-[12deg] overflow-hidden border border-brand-border bg-brand-surface shadow-2xl">
              <Image
                src="/images/fits/fit-1.png"
                alt="Outfit styling example 1"
                fill
                sizes="(min-width: 768px) 26vw, 70vw"
                className="object-cover"
              />
            </div>

            <div className="absolute left-[40%] top-[20%] z-10 aspect-[3/4] w-[58%] max-w-[320px] rotate-[10deg] overflow-hidden border border-brand-border bg-brand-surface shadow-2xl">
              <Image
                src="/images/fits/fit-2.png"
                alt="Outfit styling example 2"
                fill
                sizes="(min-width: 768px) 24vw, 70vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
