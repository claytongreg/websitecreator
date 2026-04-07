"use client";

import { useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
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

  // Double-click to edit text inline
  document.addEventListener('dblclick', function(e) {
    e.preventDefault();
    e.stopPropagation();

    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected') return;

    // Only allow inline editing for text elements
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
      el.contentEditable = 'true';
      el.focus();

      var onBlur = function() {
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
          newHTML: document.documentElement.outerHTML,
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
          newHTML: '<!DOCTYPE html>\\n' + document.documentElement.outerHTML,
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
          newHTML: '<!DOCTYPE html>\\n' + document.documentElement.outerHTML,
          movedPath: getElementPath(__wc_selectedEl),
        }, '*');
      }
    }
  });

  // Signal ready
  window.parent.postMessage({ type: 'wc_ready' }, '*');
})();
`;

export function EditorCanvas({ iframeRef }: EditorCanvasProps) {
  const { html, setHtml, selectElement, updateSelectionRect, pushAction } =
    useEditorStore();

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
        updateIframeHtml();
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
  }, [html, iframeRef]);

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
