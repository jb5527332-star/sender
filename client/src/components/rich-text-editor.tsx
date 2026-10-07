"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import ImageManager from "./image-manager";
import FileAttachment from "./file-attachment";
import { FileImage, Paperclip } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    file: File;
  }>;
  onAttachmentsChange: (
    attachments: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      file: File;
    }>
  ) => void;
  onProvideEditorApi?: (api: { insertAtCursor: (html: string) => void; focus: () => void }) => void;
}

interface FormatCommand {
  command: string;
  value?: string;
}

// HTML sanitization - allowed tags and attributes for email
const ALLOWED_TAGS = [
  "p",
  "div",
  "span",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "table",
  "tr",
  "td",
  "th",
  "tbody",
  "thead",
  "tfoot",
  "blockquote",
  "pre",
  "code",
];

const ALLOWED_ATTRIBUTES: { [key: string]: string[] } = {
  a: ["href", "title", "target"],
  img: ["src", "alt", "width", "height", "style"],
  table: ["style", "cellpadding", "cellspacing", "border"],
  td: ["style", "colspan", "rowspan"],
  th: ["style", "colspan", "rowspan"],
  "*": ["style", "class", "id"],
};

const ALLOWED_STYLES = [
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "text-decoration",
  "text-align",
  "line-height",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "border",
  "border-top",
  "border-bottom",
  "border-left",
  "border-right",
  "width",
  "height",
  "max-width",
  "min-width",
];

const RichTextEditor = ({
  content,
  onChange,
  attachments = [],
  onAttachmentsChange,
  onProvideEditorApi,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorContent, setEditorContent] = useState<string>(content || "");
  const [isHtmlView, setIsHtmlView] = useState(false);
  const [history, setHistory] = useState<string[]>([content || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showImageManager, setShowImageManager] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Email-safe fonts
  const emailSafeFonts = [
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "Times New Roman, serif", label: "Times New Roman" },
    { value: "Verdana, sans-serif", label: "Verdana" },
    { value: "Courier New, monospace", label: "Courier New" },
    { value: "Tahoma, sans-serif", label: "Tahoma" },
  ];

  // Font sizes
  const fontSizes = [
    { value: "10px", label: "10px" },
    { value: "12px", label: "12px" },
    { value: "14px", label: "14px" },
    { value: "16px", label: "16px" },
    { value: "18px", label: "18px" },
    { value: "20px", label: "20px" },
    { value: "24px", label: "24px" },
    { value: "28px", label: "28px" },
    { value: "32px", label: "32px" },
  ];

  // Update content and trigger onChange - MOVED TO TOP
  const updateContent = useCallback((): void => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorContent(newContent);
      onChange(newContent);

      // Add to history
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        return newHistory.slice(-50); // Keep last 50 states
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    }
  }, [onChange, historyIndex]);

  // Sanitize HTML for email compatibility
  const sanitizeHTML = useCallback((html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const sanitizeElement = (element: Element): void => {
      // Remove disallowed tags
      if (!ALLOWED_TAGS.includes(element.tagName.toLowerCase())) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      // Remove disallowed attributes
      const allowedAttrs =
        ALLOWED_ATTRIBUTES[element.tagName.toLowerCase()] ||
        ALLOWED_ATTRIBUTES["*"];
      Array.from(element.attributes).forEach((attr) => {
        if (!allowedAttrs.includes(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });

      // Sanitize style attribute
      if (element.hasAttribute("style")) {
        const style = element.getAttribute("style") || "";
        const sanitizedStyle = style
          .split(";")
          .filter((rule) => {
            const property = rule.split(":")[0]?.trim().toLowerCase();
            return property && ALLOWED_STYLES.includes(property);
          })
          .join(";");

        if (sanitizedStyle) {
          element.setAttribute("style", sanitizedStyle);
        } else {
          element.removeAttribute("style");
        }
      }

      // Recursively sanitize children
      Array.from(element.children).forEach((child) => sanitizeElement(child));
    };

    Array.from(doc.body.children).forEach((child) => sanitizeElement(child));
    return doc.body.innerHTML;
  }, []);

  // Insert HTML at current cursor position
  const insertHTMLAtCursor = useCallback(
    (html: string): void => {
      if (typeof window === "undefined") return;
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        // No selection, append to editor
        if (editorRef.current) {
          editorRef.current.innerHTML += html;
          // Move cursor to end
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } else {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const fragment = document.createRange().createContextualFragment(html);
        range.insertNode(fragment);

        // Move cursor to end of inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      updateContent();
    },
    [updateContent]
  );

  useEffect(() => {
    if (onProvideEditorApi) {
      onProvideEditorApi({
        insertAtCursor: (html: string) => insertHTMLAtCursor(html),
        focus: () => {
          if (editorRef.current) editorRef.current.focus();
        },
      });
    }
  }, [onProvideEditorApi, insertHTMLAtCursor]);

  // Process HTML paste with style preservation and email compatibility
  const processHTMLPaste = useCallback(
    (html: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Convert Word-specific styles to email-safe equivalents
      const convertWordStyles = (element: Element): void => {
        if (element.hasAttribute("style")) {
          let style = element.getAttribute("style") || "";

          // Convert Word font styles
          style = style.replace(
            /font-family:\s*[^;]*Calibri[^;]*/gi,
            "font-family: Arial, sans-serif"
          );
          style = style.replace(
            /font-family:\s*[^;]*Times[^;]*/gi,
            "font-family: Times New Roman, serif"
          );

          // Convert relative units to pixels
          style = style.replace(
            /(\d+(?:\.\d+)?)pt/g,
            (match, num) => `${Math.round(parseFloat(num) * 1.33)}px`
          );
          style = style.replace(
            /(\d+(?:\.\d+)?)em/g,
            (match, num) => `${Math.round(parseFloat(num) * 16)}px`
          );

          // Remove unsupported properties
          style = style.replace(/mso-[^;]*;?/gi, "");
          style = style.replace(/text-indent:\s*[^;]*;?/gi, "");

          element.setAttribute("style", style);
        }

        // Convert Word list elements
        if (
          element.tagName === "P" &&
          element.textContent?.match(/^[\u2022\u25CF\u25E6]/)
        ) {
          const li = doc.createElement("li");
          li.innerHTML = element.innerHTML.replace(
            /^[\u2022\u25CF\u25E6]\s*/,
            ""
          );
          element.replaceWith(li);
        }

        Array.from(element.children).forEach((child) =>
          convertWordStyles(child)
        );
      };

      Array.from(doc.body.children).forEach((child) =>
        convertWordStyles(child)
      );

      return sanitizeHTML(doc.body.innerHTML);
    },
    [sanitizeHTML]
  );

  // Handle paste events
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();

      const clipboardData = e.clipboardData;
      const htmlData = clipboardData.getData("text/html");
      const textData = clipboardData.getData("text/plain");

      if (htmlData) {
        // Process and sanitize HTML paste
        const processed = processHTMLPaste(htmlData);
        insertHTMLAtCursor(processed);
      } else if (textData) {
        // For plain text, preserve line breaks
        const formatted = textData.replace(/\n/g, "<br>");
        insertHTMLAtCursor(formatted);
      }
    },
    [processHTMLPaste, insertHTMLAtCursor]
  );

  // Execute formatting command
  const executeCommand = useCallback(
    (command: string, value?: string): void => {
      if (typeof document === "undefined") return;
      document.execCommand(command, false, value);
      updateContent();
    },
    [updateContent]
  );

  // Wrapper for executeCommand with focus
  const executeCommandWithFocus = useCallback(
    (command: string, value?: string): void => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
      executeCommand(command, value);
    },
    [executeCommand]
  );

  // Apply custom formatting
  const applyFormat = useCallback(
    (format: FormatCommand): void => {
      if (typeof window === "undefined" || typeof document === "undefined")
        return;

      // Ensure editor has focus first
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.focus();
      }

      const selection = window.getSelection();

      // If no selection, create one at the end
      if (!selection || selection.rangeCount === 0) {
        if (editorRef.current) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        return; // Exit after creating selection
      }

      const range = selection.getRangeAt(0);

      switch (format.command) {
        case "fontFamily":
          executeCommand("fontName", format.value);
          break;
        case "fontSize":
          if (!range.collapsed) {
            const span = document.createElement("span");
            span.style.fontSize = format.value || "14px";

            try {
              // Extract contents first
              const contents = range.extractContents();
              span.appendChild(contents);
              range.insertNode(span);

              // Move cursor after span
              range.setStartAfter(span);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            } catch {
              // Fallback for complex selections
              executeCommand("fontSize", "3");
              const selectedElement = selection.anchorNode?.parentElement;
              if (selectedElement) {
                selectedElement.style.fontSize = format.value || "14px";
              }
            }
          } else {
            // For collapsed selection, insert a span with the font size
            const span = document.createElement("span");
            span.style.fontSize = format.value || "14px";
            span.innerHTML = "&nbsp;"; // Add a space
            range.insertNode(span);
            range.setStart(span.firstChild!, 0);
            range.setEnd(span.firstChild!, 1);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          break;
        case "foreColor":
          executeCommand("foreColor", format.value);
          break;
        case "backColor":
          executeCommand("backColor", format.value);
          break;
        case "justifyLeft":
        case "justifyCenter":
        case "justifyRight":
        case "justifyFull":
          executeCommand(format.command);
          break;
        default:
          executeCommand(format.command, format.value);
      }

      updateContent();
    },
    [executeCommand, updateContent]
  );

  // Undo/Redo functionality
  const undo = useCallback((): void => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const content = history[newIndex];
      setEditorContent(content);
      setHistoryIndex(newIndex);
      onChange(content);

      if (editorRef.current) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback((): void => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const content = history[newIndex];
      setEditorContent(content);
      setHistoryIndex(newIndex);
      onChange(content);

      if (editorRef.current) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [history, historyIndex, onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case "y":
            e.preventDefault();
            redo();
            break;
          case "b":
            e.preventDefault();
            executeCommand("bold");
            break;
          case "i":
            e.preventDefault();
            executeCommand("italic");
            break;
          case "u":
            e.preventDefault();
            executeCommand("underline");
            break;
        }
      }
    },
    [executeCommand, undo, redo]
  );

  // Handle link clicks in editor
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicked element is a link or inside a link
    const link = target.closest('a');
    if (link && link.href) {
      // Prevent default behavior in contentEditable
      e.preventDefault();
      
      // Open link if Ctrl/Cmd is held or if it's a regular click
      if (e.ctrlKey || e.metaKey || !editorRef.current?.isContentEditable) {
        window.open(link.href, '_blank', 'noopener,noreferrer');
      } else {
        // Show a tooltip or indication that Ctrl+Click opens the link
        const rect = link.getBoundingClientRect();
        const tooltip = document.createElement('div');
        tooltip.textContent = 'Ctrl+Click to open link';
        tooltip.style.cssText = `
          position: fixed;
          top: ${rect.bottom + 5}px;
          left: ${rect.left}px;
          background: #333;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
          pointer-events: none;
        `;
        document.body.appendChild(tooltip);
        
        // Remove tooltip after 2 seconds
        setTimeout(() => {
          if (document.body.contains(tooltip)) {
            document.body.removeChild(tooltip);
          }
        }, 2000);
      }
    }
  }, []);

  // Handle image insertion
  const handleImageInsert = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (imageData: any) => {
      const imageHTML = `<img src="${imageData.src}" alt="${imageData.alt}" ${
        imageData.title ? `title="${imageData.title}"` : ""
      } style="${[
        imageData.width ? `width: ${imageData.width}px` : "",
        imageData.height ? `height: ${imageData.height}px` : "",
        imageData.alignment === "left"
          ? "float: left; margin: 0 10px 10px 0"
          : "",
        imageData.alignment === "right"
          ? "float: right; margin: 0 0 10px 10px"
          : "",
        imageData.alignment === "center"
          ? "display: block; margin: 10px auto"
          : "",
        imageData.alignment === "none" ? "margin: 10px 0" : "",
      ]
        .filter(Boolean)
        .join("; ")}" />`;

      // Focus editor first
      if (editorRef.current) {
        editorRef.current.focus();
      }

      insertHTMLAtCursor(imageHTML);
      setShowImageManager(false);

      // Force update
      setTimeout(() => updateContent(), 0);
    },
    [updateContent, insertHTMLAtCursor]
  );

  // Handle link dialog
  const handleLinkDialog = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const selection = window.getSelection();
    let selected = "";
    let range: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange();
      selected = selection.toString();
    }
    
    setSavedRange(range);
    setLinkText(selected || "");
    setLinkUrl("");
    setShowLinkDialog(true);
  }, []);

  // Insert link
  const insertLink = useCallback(() => {
    if (!linkText.trim() || !linkUrl.trim()) return;
    
    const linkHTML = `<a href="${linkUrl}" style="color: #0066cc; text-decoration: underline; cursor: pointer; transition: color 0.2s ease;" onmouseover="this.style.color='#004499'" onmouseout="this.style.color='#0066cc'" title="Ctrl+Click to open link">${linkText}</a>`;
    
    // Focus editor first
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Use saved range if available
    if (savedRange && typeof window !== "undefined") {
      const selection = window.getSelection();
      if (selection) {
        // Restore the saved selection
        selection.removeAllRanges();
        selection.addRange(savedRange);
        
        // Delete the selected content and insert the link
        savedRange.deleteContents();
        const fragment = document.createRange().createContextualFragment(linkHTML);
        savedRange.insertNode(fragment);
        savedRange.collapse(false);
        
        // Update selection to end of inserted content
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    } else {
      // Fallback to insertHTMLAtCursor if no saved range
      insertHTMLAtCursor(linkHTML);
    }
    
    // Close dialog and reset
    setShowLinkDialog(false);
    setLinkText("");
    setLinkUrl("");
    setSavedRange(null);
    
    // Force update
    setTimeout(() => updateContent(), 0);
  }, [linkText, linkUrl, savedRange, insertHTMLAtCursor, updateContent]);

  // Toggle HTML view
  const toggleHtmlView = (): void => {
    if (isHtmlView) {
      // Switch back to visual editor
      if (editorRef.current) {
        editorRef.current.innerHTML = sanitizeHTML(editorContent);
      }
    } else {
      // Switch to HTML view
      setEditorContent(editorRef.current?.innerHTML || "");
    }
    setIsHtmlView(!isHtmlView);
  };

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
      setEditorContent(content);
    }
  }, [content]);

  return (
    <>
      <style jsx>{`
        [contenteditable] a {
          color: #0066cc !important;
          text-decoration: underline !important;
          cursor: pointer !important;
          transition: color 0.2s ease !important;
        }
        [contenteditable] a:hover {
          color: #004499 !important;
        }
      `}</style>
      <div className="w-full mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Editor</h2>
      </div>

      {/* Toolbar */}
      <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Undo/Redo */}
          <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="text-black p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="text-black p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>

          {/* Basic formatting */}
          <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => executeCommandWithFocus("bold")}
              className="px-3 py-1 text-black font-bold rounded hover:bg-gray-200"
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => executeCommandWithFocus("italic")}
              className="px-3 py-1 text-black italic rounded hover:bg-gray-200"
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => executeCommandWithFocus("underline")}
              className="px-3 text-black py-1 underline rounded hover:bg-gray-200"
              title="Underline (Ctrl+U)"
            >
              U
            </button>
            <button
              type="button"
              onClick={() => executeCommandWithFocus("strikeThrough")}
              className="px-3 text-black py-1 line-through rounded hover:bg-gray-200"
              title="Strikethrough"
            >
              S
            </button>
          </div>

          {/* Lists */}
          <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => executeCommandWithFocus("insertUnorderedList")}
              className="text-black p-2 rounded hover:bg-gray-200"
              title="Bullet List"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => executeCommandWithFocus("insertOrderedList")}
              className="text-black p-2 rounded hover:bg-gray-200"
              title="Numbered List"
            >
              1. List
            </button>
          </div>

          {/* Font family */}
          <select
            onChange={(e) =>
              applyFormat({ command: "fontFamily", value: e.target.value })
            }
            className="text-black px-2 py-1 border border-gray-300 rounded text-sm"
            title="Font Family"
          >
            <option value="">Font Family</option>
            {emailSafeFonts.map((font) => (
              <option
                key={font.value}
                value={font.value}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </option>
            ))}
          </select>

          {/* Font size */}
          <select
            onChange={(e) =>
              applyFormat({ command: "fontSize", value: e.target.value })
            }
            className="text-black px-2 py-1 border border-gray-300 rounded text-sm"
            title="Font Size"
          >
            <option value="">Size</option>
            {fontSizes.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>

          {/* Text color */}
          <input
            type="color"
            onChange={(e) =>
              applyFormat({ command: "foreColor", value: e.target.value })
            }
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            title="Text Color"
          />

          {/* Background color */}
          <input
            type="color"
            onChange={(e) =>
              applyFormat({ command: "backColor", value: e.target.value })
            }
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            title="Background Color"
          />

          {/* Alignment */}
          <div className="text-black flex gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => applyFormat({ command: "justifyLeft" })}
              className="p-2 rounded hover:bg-gray-200"
              title="Align Left"
            >
              ⬅
            </button>
            <button
              type="button"
              onClick={() => applyFormat({ command: "justifyCenter" })}
              className="text-black p-2 rounded hover:bg-gray-200"
              title="Align Center"
            >
              ⬌
            </button>
            <button
              type="button"
              onClick={() => applyFormat({ command: "justifyRight" })}
              className="text-black p-2 rounded hover:bg-gray-200"
              title="Align Right"
            >
              ➡
            </button>
          </div>

          {/* Media */}
          <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={handleLinkDialog}
              className="p-2 rounded hover:bg-gray-200"
              title="Insert Link"
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => setShowImageManager(true)}
              className="p-2 rounded hover:bg-gray-200"
              title="Insert Image"
            >
              <FileImage className="text-black" width={20} height={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowAttachments(!showAttachments)}
              className={`p-2 rounded ${
                showAttachments ? "bg-blue-100" : "hover:bg-gray-200"
              }`}
              title="Manage Attachments"
            >
              <Paperclip className="text-black" width={20} height={20} />
            </button>
          </div>

          {/* HTML view toggle */}
          <button
            type="button"
            onClick={toggleHtmlView}
            className={`px-3 py-1 rounded ${
              isHtmlView ? "bg-blue-500 text-white" : "hover:bg-gray-200"
            }`}
            title="Toggle HTML View"
          >
            HTML
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="border-l border-r border-gray-300">
        {isHtmlView ? (
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm border-none resize-none focus:outline-none"
            placeholder="Edit HTML directly..."
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={updateContent}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onClick={handleEditorClick}
            className="text-black w-full min-h-96 p-4 border-none focus:outline-none"
            style={{
              lineHeight: "1.6",
              fontFamily: "Arial, sans-serif",
              fontSize: "14px",
            }}
            suppressContentEditableWarning={true}
            data-placeholder="Start typing your email content..."
          />
        )}
      </div>

      {/* Attachments Management */}
      {showAttachments && (
        <div className="border-l border-r border-gray-300 p-4 bg-gray-50">
          <FileAttachment
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
          />
        </div>
      )}

      {/* Attachments Summary */}
      {attachments && attachments.length > 0 && !showAttachments && (
        <div className="border-l border-r border-gray-300 p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Attachments ({attachments.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={file.id || index}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                <span className="mr-1">📎</span>
                <span className="truncate max-w-32">{file.name}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAttachments(true)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Manage attachments
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="border border-gray-300 rounded-b-lg bg-gray-50 p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {editorContent.replace(/<[^>]*>/g, "").length} characters
          </div>
          
        </div>
      </div>

      {/* Link Dialog Modal */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Insert Link</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Enter link text"
                  className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkText("");
                  setLinkUrl("");
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLink}
                disabled={!linkText.trim() || !linkUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Manager Modal */}
      <ImageManager
        isOpen={showImageManager}
        onClose={() => setShowImageManager(false)}
        onImageInsert={handleImageInsert}
      />
      </div>
    </>
  );
};

export default RichTextEditor;
