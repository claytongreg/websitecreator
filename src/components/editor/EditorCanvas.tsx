"use client";

import { useEffect, useCallback, useRef as useReactRef, useState } from "react";
import { useEditorStore } from "@/lib/editor/store";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { generateThemeCss, FONT_OPTIONS } from "@/lib/editor/theme-css";
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
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      borderWidth: computed.borderWidth,
      borderTopWidth: computed.borderTopWidth,
      borderColor: computed.borderColor,
      borderStyle: computed.borderStyle,
      borderRadius: computed.borderRadius,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textTransform: computed.textTransform,
      width: computed.width,
      height: computed.height,
      minWidth: computed.minWidth,
      maxWidth: computed.maxWidth,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      fontStyle: computed.fontStyle,
      textDecorationLine: computed.textDecorationLine,
      textShadow: computed.textShadow,
      opacity: computed.opacity,
      boxShadow: computed.boxShadow,
      __inlineStyle: el.style.cssText,
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

  // Drag-from-selection state
  var __wc_isDragging = false;
  var __wc_mouseDownInfo = null; // { x, y, el, time }
  var DRAG_THRESHOLD = 12; // px before drag starts
  var DRAG_MIN_HOLD_MS = 150; // ms mouse must be held before drag can start

  // Hover effect — suppressed during drag and on the selected element
  document.addEventListener('mousemove', function(e) {
    if (__wc_isDragging) { overlay.style.display = 'none'; return; }
    if (__wc_mouseDownInfo) return; // potential drag in progress, skip hover
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected' || el === document.body || el === document.documentElement) {
      overlay.style.display = 'none';
      return;
    }
    // Don't show hover highlight on the already-selected element — show grab cursor instead
    if (__wc_selectedEl && (__wc_selectedEl === el || __wc_selectedEl.contains(el))) {
      overlay.style.display = 'none';
      document.body.style.cursor = 'grab';
      return;
    }
    document.body.style.cursor = '';
    var rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  });

  // Helper: select an element and notify parent
  function selectAndNotify(el) {
    __wc_selectedEl = el;
    var rect = el.getBoundingClientRect();
    selectedOverlay.style.display = 'block';
    selectedOverlay.style.top = rect.top + 'px';
    selectedOverlay.style.left = rect.left + 'px';
    selectedOverlay.style.width = rect.width + 'px';
    selectedOverlay.style.height = rect.height + 'px';
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      attrs[el.attributes[i].name] = el.attributes[i].value;
    }
    window.parent.postMessage({ type: 'wc_select', selection: {
      path: getElementPath(el),
      tagName: el.tagName.toLowerCase(),
      textContent: el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent : undefined,
      attributes: attrs,
      computedStyle: getStyles(el),
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      outerHTML: el.outerHTML.substring(0, 2000),
    }}, '*');
  }

  // Mousedown — start potential drag
  document.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected' || el === document.body || el === document.documentElement) return;
    __wc_mouseDownInfo = { x: e.clientX, y: e.clientY, el: el, time: Date.now() };
  }, true);

  // Mousemove — detect drag threshold
  document.addEventListener('mousemove', function(e) {
    if (!__wc_mouseDownInfo || __wc_isDragging) return;
    var dx = e.clientX - __wc_mouseDownInfo.x;
    var dy = e.clientY - __wc_mouseDownInfo.y;
    if (Math.sqrt(dx*dx + dy*dy) >= DRAG_THRESHOLD && (Date.now() - __wc_mouseDownInfo.time) >= DRAG_MIN_HOLD_MS) {
      var el = __wc_mouseDownInfo.el;
      // If not already selected, select it first
      if (!__wc_selectedEl || __wc_selectedEl !== el) {
        selectAndNotify(el);
      }
      startDragMode(__wc_selectedEl, e.clientX, e.clientY);
      __wc_mouseDownInfo = null;
    }
  }, true);

  // Mouseup — if no drag started, treat as click-to-select
  document.addEventListener('mouseup', function(e) {
    if (__wc_isDragging) return;
    if (!__wc_mouseDownInfo) return;
    var el = __wc_mouseDownInfo.el;
    __wc_mouseDownInfo = null;
    if (!el || el.id === '__wc_overlay' || el.id === '__wc_selected' || el === document.body || el === document.documentElement) return;
    selectAndNotify(el);
  }, true);

  // Click — prevent default, selection handled by mouseup
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Reusable drag-to-move mode (called from click-drag or toolbar button)
  function startDragMode(dragEl, startX, startY) {
    __wc_isDragging = true;
    var dragGhost = null;
    var dropIndicator = null;
    var dropTarget = null;
    var dragActive = true;

    // Hide overlays during drag
    overlay.style.display = 'none';
    selectedOverlay.style.display = 'none';

    // Create ghost
    dragGhost = dragEl.cloneNode(true);
    dragGhost.id = '__wc_drag_ghost';
    dragGhost.style.cssText = 'position:fixed;pointer-events:none;opacity:0.5;z-index:100001;width:' + dragEl.offsetWidth + 'px;max-height:80px;overflow:hidden;border:2px solid #3b82f6;border-radius:4px;background:#fff;transform:translate(-50%,-50%);';
    if (startX !== null) {
      dragGhost.style.left = startX + 'px';
      dragGhost.style.top = startY + 'px';
    }
    document.body.appendChild(dragGhost);

    // Create drop indicator line
    dropIndicator = document.createElement('div');
    dropIndicator.id = '__wc_drop_indicator';
    dropIndicator.style.cssText = 'position:fixed;pointer-events:none;z-index:100000;height:3px;background:#3b82f6;border-radius:2px;display:none;transition:top 0.08s ease,left 0.08s ease,width 0.08s ease;';
    document.body.appendChild(dropIndicator);

    function findDropPosition(x, y) {
      var target = document.elementFromPoint(x, y);
      if (!target || target.id === '__wc_drag_ghost' || target.id === '__wc_drop_indicator' || target.id === '__wc_overlay' || target.id === '__wc_selected') return null;
      if (dragEl.contains(target)) return null;
      var container = target;
      while (container && container !== document.body && container !== document.documentElement) {
        var parent = container.parentElement;
        if (parent && parent !== document.body && parent !== document.documentElement) {
          var rect = container.getBoundingClientRect();
          var midY = rect.top + rect.height / 2;
          if (y < midY) {
            return { parent: parent, ref: container, side: 'before' };
          } else {
            return { parent: parent, ref: container.nextElementSibling, side: 'after', afterEl: container };
          }
        }
        container = parent;
      }
      return null;
    }

    function onDragMove(ev) {
      if (!dragActive) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (dragGhost) {
        dragGhost.style.left = ev.clientX + 'px';
        dragGhost.style.top = ev.clientY + 'px';
      }
      if (dragGhost) dragGhost.style.display = 'none';
      dropTarget = findDropPosition(ev.clientX, ev.clientY);
      if (dragGhost) dragGhost.style.display = '';
      if (dropTarget && dropIndicator) {
        var refEl = dropTarget.side === 'before' ? dropTarget.ref : (dropTarget.afterEl || null);
        if (refEl) {
          var rr = refEl.getBoundingClientRect();
          var indicatorY = dropTarget.side === 'before' ? rr.top - 2 : rr.bottom + 1;
          dropIndicator.style.display = 'block';
          dropIndicator.style.top = indicatorY + 'px';
          dropIndicator.style.left = rr.left + 'px';
          dropIndicator.style.width = rr.width + 'px';
        } else {
          var parentRect = dropTarget.parent.getBoundingClientRect();
          var lastChild = dropTarget.parent.lastElementChild;
          var botY = lastChild ? lastChild.getBoundingClientRect().bottom + 1 : parentRect.bottom - 2;
          dropIndicator.style.display = 'block';
          dropIndicator.style.top = botY + 'px';
          dropIndicator.style.left = parentRect.left + 'px';
          dropIndicator.style.width = parentRect.width + 'px';
        }
      } else if (dropIndicator) {
        dropIndicator.style.display = 'none';
      }
    }

    function onDragUp(ev) {
      if (!dragActive) return;
      dragActive = false;
      __wc_isDragging = false;
      ev.preventDefault();
      ev.stopPropagation();
      document.removeEventListener('mousemove', onDragMove, true);
      document.removeEventListener('mouseup', onDragUp, true);
      if (dragGhost && dragGhost.parentElement) dragGhost.remove();
      if (dropIndicator && dropIndicator.parentElement) dropIndicator.remove();
      if (dropTarget && dropTarget.parent) {
        try {
          dropTarget.parent.insertBefore(dragEl, dropTarget.ref || null);
        } catch(ex) {}
      }
      __wc_selectedEl = dragEl;
      sendSelectionRect();
      selectedOverlay.style.display = 'block';
      window.parent.postMessage({
        type: 'wc_html_changed',
        newHTML: getCleanHTML(),
        movedPath: getElementPath(dragEl),
      }, '*');
      document.body.style.cursor = '';
    }

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onDragMove, true);
    document.addEventListener('mouseup', onDragUp, true);
  }

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
      document.body.style.cursor = '';
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
    // Set inline styles on selected element (live preview)
    if (e.data.type === 'wc_set_style' && __wc_selectedEl) {
      var styles = e.data.styles;
      for (var key in styles) {
        if (styles.hasOwnProperty(key)) {
          __wc_selectedEl.style[key] = styles[key];
        }
      }
      sendSelectionRect();
    }
    // Commit style change — send clean HTML back for undo snapshot
    if (e.data.type === 'wc_commit_style' && __wc_selectedEl) {
      window.parent.postMessage({
        type: 'wc_style_committed',
        newHTML: getCleanHTML(),
        path: getElementPath(__wc_selectedEl),
        computedStyle: getStyles(__wc_selectedEl),
      }, '*');
    }
    // Start drag-to-move mode (from toolbar button)
    if (e.data.type === 'wc_start_drag' && __wc_selectedEl) {
      startDragMode(__wc_selectedEl, null, null);
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
  const { html, setHtml, theme, selectElement, updateSelectionRect, pushAction, commitStyleChange } =
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
      if (e.data.type === "wc_style_committed") {
        commitStyleChange(
          e.data.newHTML,
          e.data.path ?? "document",
          e.data.computedStyle
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectElement, setHtml, updateSelectionRect, pushAction, commitStyleChange]
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

    // Also load all available fonts so per-element font overrides render
    const allFamilies = FONT_OPTIONS.map(
      (f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900`
    ).join("&");
    const allFontsUrl = `https://fonts.googleapis.com/css2?${allFamilies}&display=swap`;

    let allFontsLink = doc.getElementById("wc-all-fonts") as HTMLLinkElement | null;
    if (!allFontsLink) {
      allFontsLink = doc.createElement("link");
      allFontsLink.id = "wc-all-fonts";
      allFontsLink.rel = "stylesheet";
      allFontsLink.href = allFontsUrl;
      (doc.head || doc.documentElement).appendChild(allFontsLink);
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

  // Rewrite iframe when html changes (skip if change came from style commit)
  useEffect(() => {
    const skip = useEditorStore.getState()._skipIframeRewrite;
    if (skip) {
      useEditorStore.setState({ _skipIframeRewrite: false });
      return;
    }
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

  // ── Screenshot overlay ──
  const { screenshotMode, setScreenshotMode, setScreenshotDataUrl } = useEditorStore();
  const overlayRef = useReactRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  const finishCapture = useCallback(async (region?: { x: number; y: number; w: number; h: number }) => {
    setScreenshotMode(false);
    setDragStart(null);
    setDragEnd(null);

    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) {
      toast.error("Could not access the canvas");
      return;
    }

    try {
      const full = await html2canvas(iframe.contentDocument.body, {
        useCORS: true,
        scale: 0.5,
        logging: false,
        height: iframe.clientHeight,
        windowHeight: iframe.clientHeight,
      });

      let resultCanvas: HTMLCanvasElement;

      if (region && region.w > 10 && region.h > 10) {
        // Crop to the dragged region (coords are relative to iframe element)
        const scaleX = full.width / iframe.clientWidth;
        const scaleY = full.height / iframe.clientHeight;
        resultCanvas = document.createElement("canvas");
        resultCanvas.width = region.w * scaleX;
        resultCanvas.height = region.h * scaleY;
        const ctx = resultCanvas.getContext("2d")!;
        ctx.drawImage(
          full,
          region.x * scaleX, region.y * scaleY,
          region.w * scaleX, region.h * scaleY,
          0, 0,
          resultCanvas.width, resultCanvas.height,
        );
      } else {
        resultCanvas = full;
      }

      const dataUrl = resultCanvas.toDataURL("image/jpeg", 0.7);
      setScreenshotDataUrl(dataUrl);
      toast.success("Screenshot captured");
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      toast.error("Failed to capture screenshot");
    }
  }, [iframeRef, setScreenshotMode, setScreenshotDataUrl]);

  // Cancel on Escape
  useEffect(() => {
    if (!screenshotMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setScreenshotMode(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screenshotMode, setScreenshotMode]);

  // Compute selection rect for display
  const selectionRect = dragStart && dragEnd
    ? {
        left: Math.min(dragStart.x, dragEnd.x),
        top: Math.min(dragStart.y, dragEnd.y),
        width: Math.abs(dragEnd.x - dragStart.x),
        height: Math.abs(dragEnd.y - dragStart.y),
      }
    : null;

  return (
    <div
      className="flex-1 bg-muted overflow-auto p-4"
      onClick={handleContainerClick}
    >
      <div
        className="mx-auto bg-white shadow-lg relative"
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

        {/* Screenshot capture overlay */}
        {screenshotMode && (
          <div
            ref={overlayRef}
            className="absolute inset-0 z-50"
            style={{ cursor: "crosshair", backgroundColor: "rgba(0,0,0,0.15)" }}
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              setDragEnd(null);
            }}
            onMouseMove={(e) => {
              if (!dragStart) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setDragEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseUp={(e) => {
              if (dragStart && dragEnd) {
                const w = Math.abs(dragEnd.x - dragStart.x);
                const h = Math.abs(dragEnd.y - dragStart.y);
                if (w > 10 && h > 10) {
                  finishCapture({
                    x: Math.min(dragStart.x, dragEnd.x),
                    y: Math.min(dragStart.y, dragEnd.y),
                    w,
                    h,
                  });
                  return;
                }
              }
              // Click (no meaningful drag) → capture full preview
              finishCapture();
            }}
          >
            {/* Instruction label */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none select-none">
              Click to capture full preview, or drag to select a region. Esc to cancel.
            </div>

            {/* Drag selection rectangle */}
            {selectionRect && selectionRect.width > 2 && (
              <div
                className="absolute border-2 border-white/80 pointer-events-none"
                style={{
                  left: selectionRect.left,
                  top: selectionRect.top,
                  width: selectionRect.width,
                  height: selectionRect.height,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
