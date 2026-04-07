"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import type { ElementSelection } from "@/types";

// Script injected into the iframe to handle click interception
const IFRAME_SCRIPT = `
(function() {
  // Build a unique CSS selector path for an element
  function getElementPath(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    const parts = [];
    let current = el;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + current.id;
        parts.unshift(selector);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  // Get computed styles for an element
  function getStyles(el) {
    const computed = window.getComputedStyle(el);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight,
      padding: computed.padding,
      margin: computed.margin,
      textAlign: computed.textAlign,
    };
  }

  // Highlight overlay
  let overlay = document.createElement('div');
  overlay.id = '__wc_overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);z-index:99999;transition:all 0.1s ease;display:none;';
  document.body.appendChild(overlay);

  let selectedOverlay = document.createElement('div');
  selectedOverlay.id = '__wc_selected';
  selectedOverlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #f97316;z-index:99998;display:none;';
  document.body.appendChild(selectedOverlay);

  // Hover effect
  document.addEventListener('mousemove', function(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected' || el === document.body || el === document.documentElement) {
      overlay.style.display = 'none';
      return;
    }
    const rect = el.getBoundingClientRect();
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

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected' || el === document.body || el === document.documentElement) return;

    const rect = el.getBoundingClientRect();
    selectedOverlay.style.display = 'block';
    selectedOverlay.style.top = rect.top + 'px';
    selectedOverlay.style.left = rect.left + 'px';
    selectedOverlay.style.width = rect.width + 'px';
    selectedOverlay.style.height = rect.height + 'px';

    // Get attributes
    const attrs = {};
    for (let i = 0; i < el.attributes.length; i++) {
      attrs[el.attributes[i].name] = el.attributes[i].value;
    }

    const selection = {
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

  // Double-click to edit text inline
  document.addEventListener('dblclick', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected') return;

    // Only allow inline editing for text elements
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
      el.contentEditable = 'true';
      el.focus();

      const onBlur = function() {
        el.contentEditable = 'false';
        el.removeEventListener('blur', onBlur);
        // Notify parent of the change
        window.parent.postMessage({
          type: 'wc_text_edit',
          path: getElementPath(el),
          newText: el.textContent,
          newHTML: document.documentElement.outerHTML,
        }, '*');
      };
      el.addEventListener('blur', onBlur);
    }
  }, true);

  // Listen for HTML updates from parent
  window.addEventListener('message', function(e) {
    if (e.data.type === 'wc_update_html') {
      // Replace full document
      document.open();
      document.write(e.data.html);
      document.close();
    }
    if (e.data.type === 'wc_deselect') {
      selectedOverlay.style.display = 'none';
    }
  });

  // Signal ready
  window.parent.postMessage({ type: 'wc_ready' }, '*');
})();
`;

export function EditorCanvas() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { html, setHtml, selectElement } = useEditorStore();

  // Listen for messages from iframe
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (e.data.type === "wc_select") {
        selectElement(e.data.selection as ElementSelection);
      }
      if (e.data.type === "wc_text_edit") {
        setHtml(e.data.newHTML);
      }
      if (e.data.type === "wc_ready") {
        // Iframe loaded, inject current HTML
        updateIframeHtml();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectElement, setHtml]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // When html changes in store, update iframe
  const updateIframeHtml = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Inject our interaction script into the HTML
    const htmlWithScript = html.replace(
      "</body>",
      `<script>${IFRAME_SCRIPT}</script></body>`
    );

    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlWithScript);
      doc.close();
    }
  }, [html]);

  useEffect(() => {
    updateIframeHtml();
  }, [updateIframeHtml]);

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
