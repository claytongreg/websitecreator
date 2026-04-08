export interface Snippet {
  id: string;
  name: string;
  icon: string;
  html: string;
  insertMode: "after" | "inside";
}

export interface SnippetCategory {
  id: string;
  name: string;
  snippets: Snippet[];
}

export const snippetCategories: SnippetCategory[] = [
  {
    id: "sections",
    name: "Sections",
    snippets: [
      {
        id: "hero",
        name: "Hero",
        icon: "layout-template",
        insertMode: "after",
        html: `<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
  <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">Your Headline Here</h1>
  <p class="text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">Add a compelling description that captures your audience's attention and communicates your value.</p>
  <a href="#" class="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg">Get Started <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
</section>`,
      },
      {
        id: "features",
        name: "Features",
        icon: "grid-3x3",
        insertMode: "after",
        html: `<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
  <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-all duration-300">
      <i data-lucide="zap" class="w-8 h-8 text-gray-700 mb-4"></i>
      <h3 class="text-xl font-semibold mb-3">Feature One</h3>
      <p class="text-gray-600 leading-relaxed">Describe your first feature here with compelling details.</p>
    </div>
    <div class="border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-all duration-300">
      <i data-lucide="lightbulb" class="w-8 h-8 text-gray-700 mb-4"></i>
      <h3 class="text-xl font-semibold mb-3">Feature Two</h3>
      <p class="text-gray-600 leading-relaxed">Describe your second feature here with unique highlights.</p>
    </div>
    <div class="border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-all duration-300">
      <i data-lucide="award" class="w-8 h-8 text-gray-700 mb-4"></i>
      <h3 class="text-xl font-semibold mb-3">Feature Three</h3>
      <p class="text-gray-600 leading-relaxed">Describe your third feature here to build trust.</p>
    </div>
  </div>
</section>`,
      },
      {
        id: "cta",
        name: "Call to Action",
        icon: "megaphone",
        insertMode: "after",
        html: `<section class="bg-gray-900 text-white py-20">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h2 class="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
    <p class="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">Join thousands of satisfied customers. Start your free trial today.</p>
    <a href="#" class="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300">Start Free Trial <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
  </div>
</section>`,
      },
      {
        id: "testimonials",
        name: "Testimonials",
        icon: "quote",
        insertMode: "after",
        html: `<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
  <h2 class="text-3xl font-bold text-center mb-12">What People Say</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="border border-gray-100 rounded-2xl p-8">
      <i data-lucide="quote" class="w-6 h-6 text-gray-300 mb-4"></i>
      <p class="text-gray-600 mb-6 leading-relaxed">"This product completely transformed our workflow. Highly recommended for any team."</p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gray-200"></div>
        <div><p class="font-semibold text-sm">Jane Smith</p><p class="text-xs text-gray-500">CEO, Company</p></div>
      </div>
    </div>
    <div class="border border-gray-100 rounded-2xl p-8">
      <i data-lucide="quote" class="w-6 h-6 text-gray-300 mb-4"></i>
      <p class="text-gray-600 mb-6 leading-relaxed">"Amazing quality and support. We've seen incredible results since switching."</p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gray-200"></div>
        <div><p class="font-semibold text-sm">John Doe</p><p class="text-xs text-gray-500">CTO, Startup</p></div>
      </div>
    </div>
    <div class="border border-gray-100 rounded-2xl p-8">
      <i data-lucide="quote" class="w-6 h-6 text-gray-300 mb-4"></i>
      <p class="text-gray-600 mb-6 leading-relaxed">"The best investment we've made this year. Simple, powerful, and reliable."</p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gray-200"></div>
        <div><p class="font-semibold text-sm">Sarah Lee</p><p class="text-xs text-gray-500">Director, Agency</p></div>
      </div>
    </div>
  </div>
</section>`,
      },
      {
        id: "faq",
        name: "FAQ",
        icon: "help-circle",
        insertMode: "after",
        html: `<section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
  <h2 class="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
  <div class="space-y-4">
    <details class="border border-gray-200 rounded-xl p-4 group" open>
      <summary class="font-semibold cursor-pointer list-none flex items-center justify-between">What is this product? <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform"></i></summary>
      <p class="mt-3 text-gray-600 leading-relaxed">A brief answer to this frequently asked question goes here. Keep it concise and helpful.</p>
    </details>
    <details class="border border-gray-200 rounded-xl p-4 group">
      <summary class="font-semibold cursor-pointer list-none flex items-center justify-between">How does pricing work? <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform"></i></summary>
      <p class="mt-3 text-gray-600 leading-relaxed">Explain your pricing model clearly so customers know what to expect.</p>
    </details>
    <details class="border border-gray-200 rounded-xl p-4 group">
      <summary class="font-semibold cursor-pointer list-none flex items-center justify-between">Can I cancel anytime? <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform"></i></summary>
      <p class="mt-3 text-gray-600 leading-relaxed">Yes, you can cancel your subscription at any time with no questions asked.</p>
    </details>
  </div>
</section>`,
      },
      {
        id: "contact",
        name: "Contact",
        icon: "mail",
        insertMode: "after",
        html: `<section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
  <h2 class="text-3xl font-bold text-center mb-4">Get in Touch</h2>
  <p class="text-gray-500 text-center mb-10">Have questions? We'd love to hear from you.</p>
  <form class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input type="text" placeholder="Your name" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
      <input type="email" placeholder="Your email" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
    </div>
    <textarea placeholder="Your message" rows="5" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none"></textarea>
    <button type="submit" class="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">Send Message</button>
  </form>
</section>`,
      },
      {
        id: "footer",
        name: "Footer",
        icon: "panel-bottom",
        insertMode: "after",
        html: `<footer class="border-t border-gray-200/50 mt-auto">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
      <div>
        <h4 class="font-semibold mb-4">Product</h4>
        <ul class="space-y-2 text-sm text-gray-500">
          <li><a href="#" class="hover:text-gray-900 transition">Features</a></li>
          <li><a href="#" class="hover:text-gray-900 transition">Pricing</a></li>
          <li><a href="#" class="hover:text-gray-900 transition">Changelog</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Company</h4>
        <ul class="space-y-2 text-sm text-gray-500">
          <li><a href="#" class="hover:text-gray-900 transition">About</a></li>
          <li><a href="#" class="hover:text-gray-900 transition">Blog</a></li>
          <li><a href="#" class="hover:text-gray-900 transition">Careers</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Support</h4>
        <ul class="space-y-2 text-sm text-gray-500">
          <li><a href="#" class="hover:text-gray-900 transition">Help Center</a></li>
          <li><a href="#" class="hover:text-gray-900 transition">Contact</a></li>
          <li><a href="#" class="hover:text-gray-900 transition">Status</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Legal</h4>
        <ul class="space-y-2 text-sm text-gray-500">
          <li><a href="#" class="hover:text-gray-900 transition">Privacy</a></li>
          <li><a href="#" class="hover:text-gray-900 transition">Terms</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-gray-200 pt-8 flex items-center justify-between text-sm text-gray-400">
      <span>&copy; 2026 Your Company. All rights reserved.</span>
      <div class="flex gap-4">
        <a href="#" class="hover:text-gray-600 transition"><i data-lucide="twitter" class="w-4 h-4"></i></a>
        <a href="#" class="hover:text-gray-600 transition"><i data-lucide="instagram" class="w-4 h-4"></i></a>
        <a href="#" class="hover:text-gray-600 transition"><i data-lucide="linkedin" class="w-4 h-4"></i></a>
      </div>
    </div>
  </div>
</footer>`,
      },
    ],
  },
  {
    id: "elements",
    name: "Elements",
    snippets: [
      {
        id: "heading",
        name: "Heading",
        icon: "heading",
        insertMode: "inside",
        html: `<h2 class="text-3xl font-bold mb-4">Section Heading</h2>`,
      },
      {
        id: "paragraph",
        name: "Paragraph",
        icon: "align-left",
        insertMode: "inside",
        html: `<p class="text-gray-600 leading-relaxed mb-4">Add your paragraph text here. Write something meaningful that engages your readers.</p>`,
      },
      {
        id: "button",
        name: "Button",
        icon: "mouse-pointer-click",
        insertMode: "inside",
        html: `<a href="#" class="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300">Button Text</a>`,
      },
      {
        id: "image",
        name: "Image",
        icon: "image",
        insertMode: "inside",
        html: `<img src="https://placehold.co/800x400/f3f4f6/9ca3af?text=Your+Image" alt="Description" class="w-full rounded-xl" />`,
      },
      {
        id: "divider",
        name: "Divider",
        icon: "minus",
        insertMode: "inside",
        html: `<hr class="border-gray-200 my-8" />`,
      },
      {
        id: "list",
        name: "List",
        icon: "list",
        insertMode: "inside",
        html: `<ul class="space-y-2 text-gray-600 mb-4">
  <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-green-500"></i> First item in the list</li>
  <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-green-500"></i> Second item in the list</li>
  <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-green-500"></i> Third item in the list</li>
</ul>`,
      },
    ],
  },
  {
    id: "layout",
    name: "Layout",
    snippets: [
      {
        id: "1-column",
        name: "1 Column",
        icon: "square",
        insertMode: "after",
        html: `<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
  <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column content — click to edit</div>
</section>`,
      },
      {
        id: "2-columns",
        name: "2 Columns",
        icon: "columns-2",
        insertMode: "after",
        html: `<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 1</div>
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 2</div>
  </div>
</section>`,
      },
      {
        id: "3-columns",
        name: "3 Columns",
        icon: "columns-3",
        insertMode: "after",
        html: `<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 1</div>
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 2</div>
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 3</div>
  </div>
</section>`,
      },
      {
        id: "4-columns",
        name: "4 Columns",
        icon: "layout-grid",
        insertMode: "after",
        html: `<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 1</div>
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 2</div>
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 3</div>
    <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">Column 4</div>
  </div>
</section>`,
      },
    ],
  },
];
