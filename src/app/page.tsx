import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">WebsiteCreator</span>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Build websites with AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Paste sites you love, describe your vision, and get a fully
            generated website in seconds. Then click any element to edit it, or
            just tell the AI what to change.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard/new" className={buttonVariants({ size: "lg" })}>
              Create Your Site
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Inspiration-First</h3>
              <p className="text-sm text-muted-foreground">
                Paste URLs of sites you like. We extract colors, fonts, and
                layout patterns to generate your starting point.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Click to Edit</h3>
              <p className="text-sm text-muted-foreground">
                Every element on your site is clickable and editable. Change
                text, styles, or structure with a single click.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Pay Per Edit</h3>
              <p className="text-sm text-muted-foreground">
                No subscriptions. AI edits cost fractions of a cent. Choose your
                preferred model — GPT-4o, Claude, or Gemini.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          WebsiteCreator — AI-powered website builder
        </div>
      </footer>
    </div>
  );
}
