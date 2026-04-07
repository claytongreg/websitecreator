"use client";

import { useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { generateThemeCss } from "@/lib/editor/theme-css";
import type { ElementSelection } from "@/types";

interface EditorCanvasProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

// Script injected into the iframe to handle click interception
const IFRAME_SCRIPT = `
(function() {
  // Currently selected DOM element (tracked for scroll updates & commands)
  var __wc_selectedEl = null;

  // Build a unique CSS selector path for an element
  function getElementPath(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    var parts = [];
    var current = el;
    while (current && current !== document.body) {
      var selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + current.id;
        parts.unshift(selector);
        break;
      }
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
        if (siblings.length > 1) {
          var index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  // Get clean HTML without injected overlays/script
  function getCleanHTML() {
    var ov = document.getElementById('__wc_overlay');
    var sel = document.getElementById('__wc_selected');
    if (ov) ov.remove();
    if (sel) sel.remove();
    // Remove injected script(s) — they contain our IIFE marker
    var scripts = document.querySelectorAll('script');
    var toRemove = [];
    scripts.forEach(function(s) {
      if (s.textContent && s.textContent.indexOf('__wc_selectedEl') !== -1) {
        toRemove.push(s);
      }
    });
    toRemove.forEach(function(s) { s.remove(); });
    var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    // Re-add overlays for continued editing
    document.body.appendChild(overlay);
    document.body.appendChild(selectedOverlay);
    return html;
  }

  // Get computed styles for an element
  function getStyles(el) {
    var computed = window.getComputedStyle(el);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight,
      padding: computed.padding,
      margin: computed.margin,
      textAlign: computed.textAlign,
      backgroundImage: computed.backgroundImage,
    };
  }

  // Send updated bounding rect for the selected element
  function sendSelectionRect() {
    if (!__wc_selectedEl) return;
    var rect = __wc_selectedEl.getBoundingClientRect();
    selectedOverlay.style.top = rect.top + 'px';
    selectedOverlay.style.left = rect.left + 'px';
    selectedOverlay.style.width = rect.width + 'px';
    selectedOverlay.style.height = rect.height + 'px';
    window.parent.postMessage({
      type: 'wc_selection_moved',
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }, '*');
  }

  // Highlight overlay (hover)
  var overlay = document.createElement('div');
  overlay.id = '__wc_overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);z-index:99999;transition:all 0.1s ease;display:none;';
  document.body.appendChild(overlay);

  // Selected overlay (click)
  var selectedOverlay = document.createElement('div');
  selectedOverlay.id = '__wc_selected';
  selectedOverlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #f97316;background:rgba(249,115,22,0.06);z-index:99998;display:none;';
  document.body.appendChild(selectedOverlay);

  // Hover effect
  document.addEventListener('mousemove', function(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected' || el === document.body || el === document.documentElement) {
      overlay.style.display = 'none';
      return;
    }
    var rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  });

  // Click to select
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected' || el === document.body || el === document.documentElement) return;

    __wc_selectedEl = el;

    var rect = el.getBoundingClientRect();
    selectedOverlay.style.display = 'block';
    selectedOverlay.style.top = rect.top + 'px';
    selectedOverlay.style.left = rect.left + 'px';
    selectedOverlay.style.width = rect.width + 'px';
    selectedOverlay.style.height = rect.height + 'px';

    // Get attributes
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      attrs[el.attributes[i].name] = el.attributes[i].value;
    }

    var selection = {
      path: getElementPath(el),
      tagName: el.tagName.toLowerCase(),
      textContent: el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent : undefined,
      attributes: attrs,
      computedStyle: getStyles(el),
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      outerHTML: el.outerHTML.substring(0, 2000),
    };

    window.parent.postMessage({ type: 'wc_select', selection: selection }, '*');
  }, true);

  // Check if an element is editable (contains some text content)
  function isTextEditable(el) {
    var tag = el.tagName.toLowerCase();
    var textTags = ['h1','h2','h3','h4','h5','h6','p','span','a','li','label','blockquote','figcaption','cite','td','th','dt','dd','button','caption','legend','summary'];
    if (textTags.indexOf(tag) !== -1) return true;
    // Also allow if element has direct text content
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) return true;
    }
    return false;
  }

  // Double-click to edit text inline
  document.addEventListener('dblclick', function(e) {
    e.preventDefault();
    e.stopPropagation();

    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected') return;

    // Allow inline editing for text-containing elements
    if (isTextEditable(el)) {
      el.contentEditable = 'true';
      el.focus();
      // Select all text
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      var onBlur = function() {
        el.contentEditable = 'false';
        el.removeEventListener('blur', onBlur);
        // Notify parent of the change with clean HTML
        window.parent.postMessage({
          type: 'wc_text_edit',
          path: getElementPath(el),
          newText: el.textContent,
          newHTML: getCleanHTML(),
        }, '*');
      };
      el.addEventListener('blur', onBlur);
    }
  }, true);

  // Scroll tracking — update toolbar position
  var scrollTimeout = null;
  document.addEventListener('scroll', function() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(sendSelectionRect, 30);
  }, true);
  window.addEventListener('resize', function() {
    sendSelectionRect();
  });

  // Listen for messages from parent
  window.addEventListener('message', function(e) {
    if (e.data.type === 'wc_update_html') {
      document.open();
      document.write(e.data.html);
      document.close();
    }
    if (e.data.type === 'wc_deselect') {
      __wc_selectedEl = null;
      selectedOverlay.style.display = 'none';
    }
    // Trigger inline text editing from toolbar button
    if (e.data.type === 'wc_trigger_edit' && __wc_selectedEl) {
      var target = __wc_selectedEl;
      target.contentEditable = 'true';
      target.focus();
      // Select all text
      var range = document.createRange();
      range.selectNodeContents(target);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      var onBlur = function() {
        target.contentEditable = 'false';
        target.removeEventListener('blur', onBlur);
        window.parent.postMessage({
          type: 'wc_text_edit',
          path: getElementPath(target),
          newText: target.textContent,
          newHTML: getCleanHTML(),
        }, '*');
      };
      target.addEventListener('blur', onBlur);
    }
    // Move element up
    if (e.data.type === 'wc_move_up' && __wc_selectedEl) {
      var prev = __wc_selectedEl.previousElementSibling;
      if (prev) {
        __wc_selectedEl.parentElement.insertBefore(__wc_selectedEl, prev);
        sendSelectionRect();
        window.parent.postMessage({
          type: 'wc_html_changed',
          newHTML: getCleanHTML(),
          movedPath: getElementPath(__wc_selectedEl),
        }, '*');
      }
    }
    // Move element down
    if (e.data.type === 'wc_move_down' && __wc_selectedEl) {
      var next = __wc_selectedEl.nextElementSibling;
      if (next) {
        __wc_selectedEl.parentElement.insertBefore(next, __wc_selectedEl);
        sendSelectionRect();
        window.parent.postMessage({
          type: 'wc_html_changed',
          newHTML: getCleanHTML(),
          movedPath: getElementPath(__wc_selectedEl),
        }, '*');
      }
    }
    // Resize element width
    if (e.data.type === 'wc_resize' && __wc_selectedEl) {
      if (e.data.width) {
        __wc_selectedEl.style.width = e.data.width;
        __wc_selectedEl.style.maxWidth = e.data.width;
      } else {
        __wc_selectedEl.style.width = '';
        __wc_selectedEl.style.maxWidth = '';
      }
      sendSelectionRect();
      window.parent.postMessage({
        type: 'wc_html_changed',
        newHTML: getCleanHTML(),
        movedPath: getElementPath(__wc_selectedEl),
      }, '*');
    }
  });

  // Signal ready
  window.parent.postMessage({ type: 'wc_ready' }, '*');
})();
`;

export function EditorCanvas({ iframeRef }: EditorCanvasProps) {
  const { html, setHtml, theme, selectElement, updateSelectionRect, pushAction } =
    useEditorStore();

  // Listen for messages from iframe
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (e.data.type === "wc_select") {
        selectElement(e.data.selection as ElementSelection);
      }
      if (e.data.type === "wc_text_edit") {
        const before = useEditorStore.getState().html;
        pushAction({
          type: "edit",
          elementPath: e.data.path ?? "document",
          before,
          after: e.data.newHTML,
          timestamp: Date.now(),
        });
      }
      if (e.data.type === "wc_ready") {
        // Initial load only — apply theme CSS in-place
        updateThemeInIframe();
      }
      if (e.data.type === "wc_selection_moved") {
        updateSelectionRect(e.data.boundingRect);
      }
      if (e.data.type === "wc_html_changed") {
        const before = useEditorStore.getState().html;
        pushAction({
          type: "edit",
          elementPath: e.data.movedPath ?? "document",
          before,
          after: e.data.newHTML,
          timestamp: Date.now(),
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectElement, setHtml, updateSelectionRect, pushAction]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Update only the theme <style> tag inside the existing iframe (no full rewrite)
  const updateThemeInIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const currentTheme = useEditorStore.getState().theme;
    const themeCss = generateThemeCss(currentTheme);

    // Insert or replace theme style element
    let styleEl = doc.getElementById("wc-theme");
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "wc-theme";
      (doc.head || doc.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = themeCss;

    // Also load Google Fonts via a link tag if not already present
    const fonts = new Set([currentTheme.fonts.heading, currentTheme.fonts.body]);
    const families = Array.from(fonts)
      .map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900`)
      .join("&");
    const fontsUrl = `https://fonts.googleapis.com/css2?${families}&display=swap`;

    let linkEl = doc.getElementById("wc-theme-fonts") as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = doc.createElement("link");
      linkEl.id = "wc-theme-fonts";
      linkEl.rel = "stylesheet";
      (doc.head || doc.documentElement).appendChild(linkEl);
    }
    if (linkEl.href !== fontsUrl) {
      linkEl.href = fontsUrl;
    }
  }, [iframeRef]);

  // When html changes, rewrite the full iframe
  const updateIframeHtml = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    const scriptTag = `<script>${IFRAME_SCRIPT}</script>`;
    let htmlWithScript: string;

    // Try to inject before </body>, falling back to </html>, or just append
    if (html.match(/<\/body>/i)) {
      htmlWithScript = html.replace(/<\/body>/i, `${scriptTag}</body>`);
    } else if (html.match(/<\/html>/i)) {
      htmlWithScript = html.replace(/<\/html>/i, `${scriptTag}</html>`);
    } else {
      htmlWithScript = html + scriptTag;
    }

    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlWithScript);
      doc.close();
    }
  }, [html, iframeRef]);

  // Rewrite iframe when html changes
  useEffect(() => {
    updateIframeHtml();
  }, [updateIframeHtml]);

  // Apply theme in-place when theme changes (no iframe rewrite)
  useEffect(() => {
    updateThemeInIframe();
  }, [theme, updateThemeInIframe]);

  // Click outside iframe to deselect
  const handleContainerClick = () => {
    selectElement(null);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wc_deselect" },
      "*"
    );
  };

  return (
    <div
      className="flex-1 bg-muted overflow-auto p-4"
      onClick={handleContainerClick}
    >
      <div
        className="mx-auto bg-white shadow-lg"
        style={{ width: "100%", maxWidth: "1280px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          ref={iframeRef}
          className="w-full border-0"
          style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}
          sandbox="allow-scripts allow-same-origin"
          title="Website preview"
        />
      </div>
    </div>
  );
}
