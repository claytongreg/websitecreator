import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] dark:bg-[#09090b]">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-[#fafafa]/80 dark:bg-[#09090b]/80">
        <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">
            echo<span className="font-bold">webo</span>
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/new"
              className={buttonVariants({ size: "sm" })}
            >
              Start building
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-24">
        <section className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">
            AI Website Builder
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Describe it.
            <br />
            <span className="text-muted-foreground">We build it.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
            Paste sites you love, describe your vision, pick a style. Your
            website appears in seconds — then click anything to change it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/new"
              className={buttonVariants({ size: "lg" }) + " gap-2"}
            >
              Create your site
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-3xl mx-auto mt-32 mb-24 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-3xl mb-3">1</div>
              <h3 className="font-semibold mb-1.5 text-sm">Inspire</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Paste URLs of sites you like. We extract their colors, fonts,
                and layout.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">2</div>
              <h3 className="font-semibold mb-1.5 text-sm">Generate</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Describe your business. AI builds every page with your chosen
                style.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">3</div>
              <h3 className="font-semibold mb-1.5 text-sm">Edit</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Click any element or type a prompt. Changes cost fractions of a
                cent.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-xs text-muted-foreground">
          EchoWebo
        </div>
      </footer>
    </div>
  );
}
