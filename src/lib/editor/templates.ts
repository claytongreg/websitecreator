export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  pages: { slug: string; title: string; html: string }[];
}

export const blankTemplate: SiteTemplate = {
  id: "blank",
  name: "Blank",
  description: "Start from scratch",
  pages: [
    {
      slug: "index",
      title: "Home",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <style>
    html { scroll-behavior: smooth; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body class="min-h-screen bg-white text-gray-900">
  <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold text-gray-900">My Site</a>
      <div class="flex items-center gap-8 text-sm font-medium text-gray-600">
        <a href="/" class="hover:text-gray-900 transition-colors">Home</a>
        <a href="/about" class="hover:text-gray-900 transition-colors">About</a>
        <a href="/contact" class="hover:text-gray-900 transition-colors">Contact</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
      <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-sm font-medium text-gray-600 mb-6"><i data-lucide="sparkles" class="w-4 h-4"></i> Welcome</span>
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">Welcome to My Website</h1>
      <p class="text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
        This is your starting point. Click any element to edit it, or use the AI prompt bar to make changes with natural language.
      </p>
      <a href="#" class="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-gray-900/25">
        Get Started <i data-lucide="arrow-right" class="w-4 h-4"></i>
      </a>
    </section>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group" style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.1s">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5"><i data-lucide="zap" class="w-7 h-7 text-gray-700 group-hover:scale-110 transition-transform"></i></div>
          <h3 class="text-xl font-semibold mb-3">Feature One</h3>
          <p class="text-gray-600 leading-relaxed">Describe your first feature or service here. Add compelling details to engage visitors.</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group" style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.2s">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5"><i data-lucide="lightbulb" class="w-7 h-7 text-gray-700 group-hover:scale-110 transition-transform"></i></div>
          <h3 class="text-xl font-semibold mb-3">Feature Two</h3>
          <p class="text-gray-600 leading-relaxed">Describe your second feature or service here. Highlight what makes you unique.</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group" style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.3s">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5"><i data-lucide="award" class="w-7 h-7 text-gray-700 group-hover:scale-110 transition-transform"></i></div>
          <h3 class="text-xl font-semibold mb-3">Feature Three</h3>
          <p class="text-gray-600 leading-relaxed">Describe your third feature or service here. Build trust with your audience.</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="border-t border-gray-200/50 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between text-gray-400 text-sm">
      <span>&copy; 2026 My Website. All rights reserved.</span>
      <div class="flex gap-4">
        <a href="#" class="hover:text-gray-600 transition"><i data-lucide="twitter" class="w-4 h-4"></i></a>
        <a href="#" class="hover:text-gray-600 transition"><i data-lucide="instagram" class="w-4 h-4"></i></a>
        <a href="#" class="hover:text-gray-600 transition"><i data-lucide="linkedin" class="w-4 h-4"></i></a>
      </div>
    </div>
  </footer>

  <script>lucide.createIcons();</script>
</body>
</html>`,
    },
  ],
};

export const defaultTemplates: SiteTemplate[] = [blankTemplate];
