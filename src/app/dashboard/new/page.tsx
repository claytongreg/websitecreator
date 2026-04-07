"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InspirationStep } from "@/components/onboarding/InspirationStep";
import { DescriptionStep } from "@/components/onboarding/DescriptionStep";
import { StylePreview } from "@/components/onboarding/StylePreview";
import { GeneratingView } from "@/components/onboarding/GeneratingView";
import type { InspirationSite, StyleOption } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Step = "inspiration" | "description" | "style" | "generating";

export default function NewSitePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("inspiration");

  // Onboarding state
  const [inspirations, setInspirations] = useState<InspirationSite[]>([]);
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [selectedPages, setSelectedPages] = useState<string[]>([
    "home",
    "about",
    "contact",
  ]);
  const [siteName, setSiteName] = useState("");
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([]);
  const [chosenStyle, setChosenStyle] = useState<StyleOption | null>(null);

  const steps: Step[] = ["inspiration", "description", "style", "generating"];
  const currentIndex = steps.indexOf(step);

  const canGoNext = () => {
    switch (step) {
      case "inspiration":
        return true; // inspiration is optional
      case "description":
        return description.trim().length > 0 && siteName.trim().length > 0;
      case "style":
        return chosenStyle !== null;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step === "description") {
      // Generate style options before moving to style step
      setStep("style");
      try {
        const resp = await fetch("/api/ai/generate-styles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inspirations,
            description,
            businessType,
          }),
        });
        const data = await resp.json();
        setStyleOptions(data.options ?? []);
      } catch {
        // Provide fallback style options
        setStyleOptions(getFallbackStyles());
      }
    } else if (step === "style") {
      setStep("generating");
      // Trigger site generation
      try {
        const resp = await fetch("/api/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: siteName,
            description,
            businessType,
            pages: selectedPages,
            inspirations,
            style: chosenStyle,
          }),
        });
        const data = await resp.json();
        if (data.site?.id) {
          router.push(`/editor/${data.site.id}/index`);
        }
      } catch (err) {
        console.error("Failed to create site:", err);
      }
    } else {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">Create New Site</span>
          <div className="flex gap-2">
            {["Inspiration", "Describe", "Style", "Generate"].map((label, i) => (
              <span
                key={label}
                className={`text-xs px-3 py-1 rounded-full ${
                  i === currentIndex
                    ? "bg-foreground text-background"
                    : i < currentIndex
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
        {step === "inspiration" && (
          <InspirationStep
            inspirations={inspirations}
            onAdd={(site) => setInspirations([...inspirations, site])}
            onRemove={(url) =>
              setInspirations(inspirations.filter((i) => i.url !== url))
            }
          />
        )}

        {step === "description" && (
          <DescriptionStep
            siteName={siteName}
            onSiteNameChange={setSiteName}
            description={description}
            onDescriptionChange={setDescription}
            businessType={businessType}
            onBusinessTypeChange={setBusinessType}
            selectedPages={selectedPages}
            onPagesChange={setSelectedPages}
          />
        )}

        {step === "style" && (
          <StylePreview
            options={styleOptions}
            chosen={chosenStyle}
            onChoose={setChosenStyle}
            onRegenerate={() => handleNext()} // will re-fetch
          />
        )}

        {step === "generating" && (
          <GeneratingView siteName={siteName} pages={selectedPages} />
        )}
      </main>

      {step !== "generating" && (
        <footer className="border-t">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={!canGoNext()}>
              {step === "style" ? "Generate Site" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

function getFallbackStyles(): StyleOption[] {
  return [
    {
      id: "modern-light",
      name: "Modern Light",
      colors: ["#ffffff", "#f8f9fa", "#212529", "#0d6efd", "#6c757d"],
      fonts: { heading: "Inter", body: "Inter" },
      mood: "Clean, professional, contemporary",
    },
    {
      id: "warm-earth",
      name: "Warm Earth",
      colors: ["#faf6f1", "#e8ddd3", "#3d2b1f", "#c67b3c", "#8b6f47"],
      fonts: { heading: "Playfair Display", body: "Source Sans Pro" },
      mood: "Warm, artisanal, inviting",
    },
    {
      id: "dark-bold",
      name: "Dark & Bold",
      colors: ["#0a0a0a", "#1a1a2e", "#e0e0e0", "#e94560", "#533483"],
      fonts: { heading: "Space Grotesk", body: "DM Sans" },
      mood: "Bold, dramatic, high-contrast",
    },
  ];
}
