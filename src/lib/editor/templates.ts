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
</head>
<body class="min-h-screen bg-white text-gray-900">
  <header class="border-b">
    <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold">My Site</a>
      <div class="flex gap-6">
        <a href="/" class="text-gray-600 hover:text-gray-900">Home</a>
        <a href="/about" class="text-gray-600 hover:text-gray-900">About</a>
        <a href="/contact" class="text-gray-600 hover:text-gray-900">Contact</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="max-w-6xl mx-auto px-6 py-24 text-center">
      <h1 class="text-5xl font-bold mb-6">Welcome to My Website</h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
        This is your starting point. Click any element to edit it, or use the AI prompt bar to make changes with natural language.
      </p>
      <a href="#" class="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
        Get Started
      </a>
    </section>

    <section class="max-w-6xl mx-auto px-6 py-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-6 border rounded-lg">
          <h3 class="text-lg font-semibold mb-2">Feature One</h3>
          <p class="text-gray-600">Describe your first feature or service here.</p>
        </div>
        <div class="p-6 border rounded-lg">
          <h3 class="text-lg font-semibold mb-2">Feature Two</h3>
          <p class="text-gray-600">Describe your second feature or service here.</p>
        </div>
        <div class="p-6 border rounded-lg">
          <h3 class="text-lg font-semibold mb-2">Feature Three</h3>
          <p class="text-gray-600">Describe your third feature or service here.</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="border-t mt-auto">
    <div class="max-w-6xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
      &copy; 2026 My Website. All rights reserved.
    </div>
  </footer>
</body>
</html>`,
    },
  ],
};

export const defaultTemplates: SiteTemplate[] = [blankTemplate];
