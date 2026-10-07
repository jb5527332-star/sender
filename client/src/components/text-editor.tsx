"use client";

import React, { useRef, useEffect, useState } from "react";

import { TextEditorProps } from "@/interfaces/components-interface";

export default function TextEditor({
  content,
  onChange,
  format,
}: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    if (format === "html" && editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content, format]);

  const handleLinkDialog = () => {
    if (format !== "html") return;
    
    const editor = editorRef.current;
    if (!editor || typeof document === 'undefined') return;

    // Get selected text
    const selection = window.getSelection();
    const selected = selection?.toString() || "";
    
    setSelectedText(selected);
    setLinkText(selected);
    setLinkUrl("https://");
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    if (format !== "html") return;
    
    const editor = editorRef.current;
    if (!editor || typeof document === 'undefined') return;

    editor.focus();

    try {
      if (selectedText) {
        // If there was selected text, replace it with the link
        document.execCommand("insertHTML", false, `<a href="${linkUrl}" target="_blank">${linkText}</a>`);
      } else {
        // If no text was selected, insert the link at cursor position
        document.execCommand("insertHTML", false, `<a href="${linkUrl}" target="_blank">${linkText}</a>`);
      }

      // Update content after inserting link
      const newContent = editor.innerHTML;
      onChange(newContent);
    } catch (error) {
      console.error("Error inserting link:", error);
    }

    // Reset dialog state
    setShowLinkDialog(false);
    setLinkText("");
    setLinkUrl("");
    setSelectedText("");
  };

  const handleFormatCommand = (command: string) => {
    if (format !== "html") {
      return;
    }

    const editor = editorRef.current;
    if (!editor || typeof document === 'undefined') return;

    editor.focus();

    try {
      switch (command) {
        case "bold":
          document.execCommand("bold", false);
          break;
        case "italic":
          document.execCommand("italic", false);
          break;
        case "underline":
          document.execCommand("underline", false);
          break;
        case "link":
          handleLinkDialog();
          break;
        case "heading":
          document.execCommand("formatBlock", false, "h2");
          break;
        case "paragraph":
          document.execCommand("formatBlock", false, "p");
          break;
        case "bulletList":
          document.execCommand("insertUnorderedList", false);
          break;
        case "numberedList":
          document.execCommand("insertOrderedList", false);
          break;
        default:
          return;
      }

      // Update content after formatting
      const newContent = editor.innerHTML;
      onChange(newContent);
    } catch (error) {
      console.error("Error executing format command:", error);
    }
  };

  const handleContentChange = () => {
    if (format === "html" && editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-4">
      {format === "html" && (
        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-gray-50">
          <button
            type="button"
            onClick={() => handleFormatCommand("bold")}
            className="px-3 py-1 text-sm font-bold bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => handleFormatCommand("italic")}
            className="px-3 py-1 text-sm italic bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => handleFormatCommand("underline")}
            className="px-3 py-1 text-sm underline bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => handleFormatCommand("link")}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => handleFormatCommand("heading")}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => handleFormatCommand("paragraph")}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => handleFormatCommand("bulletList")}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => handleFormatCommand("numberedList")}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            1. List
          </button>
        </div>
      )}

      {format === "html" ? (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
          style={{ 
            minHeight: "256px",
            direction: "ltr",
            textAlign: "left",
            unicodeBidi: "embed"
          }}
          suppressContentEditableWarning={true}
          data-placeholder="Enter your message here..."
          dir="ltr"
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your message here..."
        />
      )}

      {/* Link Dialog Modal */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="linkText" className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  id="linkText"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter link text"
                />
              </div>
              
              <div>
                <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  id="linkUrl"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLink}
                disabled={!linkText.trim() || !linkUrl.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
