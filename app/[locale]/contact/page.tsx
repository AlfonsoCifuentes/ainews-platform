import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Mail, MapPin, MessageSquare } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const t = await getTranslations({ locale, namespace: 'common.nav' });

  return {
    title: 'Contact Us - ThotNet Core',
    description: 'Get in touch with the ThotNet Core team for inquiries, support, or feedback.',
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
      
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <p className="text-lg text-muted-foreground">
            We value your feedback and inquiries. Whether you have a question about our AI courses, 
            need technical support, or want to discuss partnership opportunities, we&apos;re here to help.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Email Us</h3>
                <p className="text-muted-foreground mb-2">For general inquiries and support:</p>
                <a href="mailto:contact@thotnet.ai" className="text-primary hover:underline font-medium">
                  contact@thotnet.ai
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Support</h3>
                <p className="text-muted-foreground">
                  Our AI agents and human team monitor support requests 24/7. 
                  Expect a response within 24-48 hours.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Location</h3>
                <p className="text-muted-foreground">
                  ThotNet Core operates as a distributed, cloud-native organization.
                  <br />
                  Global Headquarters: Digital Realm (US-East-1)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">Name</label>
              <input 
                type="text" 
                id="name" 
                className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <input 
                type="email" 
                id="email" 
                className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-2">Subject</label>
              <select 
                id="subject" 
                className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              >
                <option>General Inquiry</option>
                <option>Technical Support</option>
                <option>Content Feedback</option>
                <option>Partnership</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">Message</label>
              <textarea 
                id="message" 
                rows={5}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                placeholder="How can we help you?"
              ></textarea>
            </div>
            <button 
              type="button" // Changed to button to prevent submission for now
              className="w-full py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Send Message
            </button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              By sending this message, you agree to our Privacy Policy and Terms of Service.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
