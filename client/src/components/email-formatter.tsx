"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { TemplateParser } from "@/utils/template-parser";
import { FormattedEmail } from "@/interfaces/template-interface";
import DashboardLayout from "./DashboardLayout";
import RichTextEditor from "@/components/rich-text-editor";
import { CSVParser } from "@/utils/csv-parser";
import CSVUploader from "./csv-uploader";
import { useToast } from "./toast";

export default function EmailFormatter() {
  const [template, setTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectFocused, setSubjectFocused] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<FormattedEmail[]>([]);
  const [activeTab, setActiveTab] = useState<"template" | "data" | "preview">(
    "template"
  );
  const [attachments, setAttachments] = useState<
    Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      file: File;
    }>
  >([]);

  // CSV Upload States
  const [csvData, setCSVData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Table-based data rows
  const [dataRows, setDataRows] = useState<Record<string, string>[]>([{}]);
  const [dataLinks, setDataLinks] = useState<
    Record<number, Record<string, string>>
  >({});
  const [linkEditor, setLinkEditor] = useState<{
    open: boolean;
    rowIndex: number | null;
    key: string | null;
    url: string;
  }>({ open: false, rowIndex: null, key: null, url: "" });

  const STORAGE_KEY = "email_formatter_state";
  const [hydrated, setHydrated] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editorApi, setEditorApi] = useState<{ insertAtCursor: (html: string) => void; focus: () => void } | null>(null);

  const { toast } = useToast();

  // Load saved state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const savedTemplate =
        typeof saved.template === "string" ? saved.template : "";
      const savedSubject =
        typeof saved.subject === "string" ? saved.subject : "";
      const savedDataRows = Array.isArray(saved.dataRows)
        ? saved.dataRows
        : [{}];
      const savedDataLinks =
        typeof saved.dataLinks === "object" && saved.dataLinks
          ? saved.dataLinks
          : {};
      const savedActiveTab = ["template", "data", "preview"].includes(
        saved.activeTab
      )
        ? saved.activeTab
        : "template";
      const savedFileName =
        typeof saved.fileName === "string" ? saved.fileName : null;
      const savedCSVHeaders = Array.isArray(saved.csvHeaders)
        ? saved.csvHeaders
        : [];
      const savedCSVData = Array.isArray(saved.csvData) ? saved.csvData : [];

      setTemplate(savedTemplate);
      setSubject(savedSubject);
      setDataRows(savedDataRows);
      setDataLinks(savedDataLinks);
      setActiveTab(savedActiveTab);
      setFileName(savedFileName);
      setCSVHeaders(savedCSVHeaders);
      setCSVData(savedCSVData);

      if (savedCSVHeaders.length > 0) {
        setDetectedVars(savedCSVHeaders);
      } else {
        const bodyVars = TemplateParser.extractPlaceholders(savedTemplate);
        const subjectVars = TemplateParser.extractPlaceholders(savedSubject);
        const vars = Array.from(new Set([...bodyVars, ...subjectVars]));
        setDetectedVars(vars);
      }
    } catch {
      // ignore malformed localStorage
    }
    setHydrated(true);
  }, []);

  // Persist state to localStorage on changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload = {
        template,
        subject,
        dataRows,
        dataLinks,
        activeTab,
        fileName,
        csvHeaders,
        csvData,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // storage might be unavailable; fail silently
    }
  }, [
    hydrated,
    template,
    subject,
    dataRows,
    dataLinks,
    activeTab,
    fileName,
    csvHeaders,
    csvData,
  ]);

  // CSV Upload Handler
  const handleCSVUpload = async (file: File) => {
    // Check file extension first
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid File Type",
        description:
          "Please upload a CSV file. If you have an Excel file (.xlsx/.xls), save it as CSV first: File > Save As > CSV (Comma delimited)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await CSVParser.parseFile(file);

      setCSVHeaders(result.headers);
      setCSVData(result.data);
      setDetectedVars(result.headers);
      setFileName(file.name);

      // Initialize dataRows with CSV data
      setDataRows(result.data);

      toast({
        title: "Success! ✓",
        description: `Detected ${result.headers.length} variables from ${result.rowCount} rows`,
      });
    } catch (error) {
      console.error("CSV parse error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to parse CSV file. Please check the format.",
        variant: "destructive",
      });

      // Clear any partial state
      setCSVData([]);
      setCSVHeaders([]);
      setDetectedVars([]);
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };
  const handleClearCSV = () => {
    setCSVData([]);
    setCSVHeaders([]);
    setDetectedVars([]);
    setFileName(null);
    setTemplate("");
    setSubject("");
    setGeneratedEmails([]);
    setTemplateError(null);
    setDataRows([{}]);
    setDataLinks({});
  };

  // Keep dataRows columns in sync with detected placeholders
  useEffect(() => {
    if (detectedVars.length === 0) return;

    // If we have CSV data, use it directly
    if (
      csvData.length > 0 &&
      dataRows.length === 1 &&
      Object.keys(dataRows[0]).length === 0
    ) {
      setDataRows(csvData);
      return;
    }

    setDataRows((prev) =>
      prev.map((row) => {
        const updated: Record<string, string> = { ...row };
        detectedVars.forEach((key) => {
          if (!(key in updated)) updated[key] = "";
        });
        Object.keys(updated).forEach((key) => {
          if (!detectedVars.includes(key)) {
            delete updated[key];
          }
        });
        return updated;
      })
    );
  }, [detectedVars, csvData, dataRows]);

  const addRow = (): void => {
    const base: Record<string, string> = {};
    detectedVars.forEach((k) => (base[k] = ""));
    setDataRows((prev) => [...prev, base]);
  };

  const removeRow = (index: number): void => {
    setDataRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCell = (index: number, key: string, value: string): void => {
    setDataRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const openLinkModal = (rowIndex: number, key: string) => {
    const existingUrl = dataLinks[rowIndex]?.[key] ?? "";
    setLinkEditor({ open: true, rowIndex, key, url: existingUrl });
  };

  const closeLinkModal = () => {
    setLinkEditor({ open: false, rowIndex: null, key: null, url: "" });
  };

  const saveLink = () => {
    if (linkEditor.rowIndex === null || !linkEditor.key) return;
    setDataLinks((prev) => {
      const rowLinks = prev[linkEditor.rowIndex!]
        ? { ...prev[linkEditor.rowIndex!] }
        : {};
      rowLinks[linkEditor.key!] = linkEditor.url.trim();
      return { ...prev, [linkEditor.rowIndex!]: rowLinks };
    });
    closeLinkModal();
  };

  const clearLink = () => {
    if (linkEditor.rowIndex === null || !linkEditor.key) return;
    setDataLinks((prev) => {
      const rowLinks = { ...(prev[linkEditor.rowIndex!] || {}) };
      delete rowLinks[linkEditor.key!];
      return { ...prev, [linkEditor.rowIndex!]: rowLinks };
    });
    closeLinkModal();
  };

  // Recompute detected variables from both subject and body
  const recomputeDetectedVars = useCallback((tpl: string, subj: string): void => {
    // If CSV is uploaded, use CSV headers as the source of truth
    if (csvHeaders.length > 0) {
      setDetectedVars(csvHeaders);
      return;
    }

    const bodyVars = TemplateParser.extractPlaceholders(tpl);
    const subjectVars = TemplateParser.extractPlaceholders(subj);
    const vars = Array.from(new Set([...bodyVars, ...subjectVars]));
    setDetectedVars(vars);
  }, [csvHeaders]);

  const handleTemplateChange = (value: string) => {
    setTemplate(value);

    // Validate template only uses detected variables from CSV
    if (csvHeaders.length > 0) {
      const validation = TemplateParser.validateTemplate(value, csvHeaders);
      if (!validation.valid) {
        setTemplateError(
          `Invalid variables used: ${validation.invalidVars
            .map((v) => `{{${v}}}`)
            .join(", ")}. Only use detected variables from CSV.`
        );
      } else {
        setTemplateError(null);
      }
    } else {
      recomputeDetectedVars(value, subject);
    }
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);

    // Validate subject only uses detected variables from CSV
    if (csvHeaders.length > 0) {
      const validation = TemplateParser.validateTemplate(value, csvHeaders);
      if (!validation.valid) {
        setTemplateError(
          `Invalid variables in subject: ${validation.invalidVars
            .map((v) => `{{${v}}}`)
            .join(", ")}. Only use detected variables from CSV.`
        );
      } else {
        setTemplateError(null);
      }
    } else {
      recomputeDetectedVars(template, value);
    }
  };

  const insertVariable = (variable: string) => {
    const placeholder = `{{${variable}}}`;
    if (subjectFocused && subjectInputRef && subjectInputRef.current) {
      const el = subjectInputRef.current as HTMLInputElement;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = subject.slice(0, start) + placeholder + subject.slice(end);
      setSubject(next);
      setTimeout(() => {
        el.focus();
        const pos = start + placeholder.length;
        el.setSelectionRange(pos, pos);
      }, 0);
      return;
    }
    if (editorApi) {
      editorApi.focus();
      editorApi.insertAtCursor(placeholder);
    }
  };

  const handleGenerate = () => {
    if (!template || !subject) {
      toast({
        title: "Error",
        description: "Please provide both subject and template",
        variant: "destructive",
      });
      return;
    }

    const rowsToUse = dataRows.some((r) =>
      Object.values(r).some((v) => v && v.length > 0)
    )
      ? dataRows
      : [];

    if (rowsToUse.length === 0) {
      toast({
        title: "Error",
        description: "Please add data to generate emails",
        variant: "destructive",
      });
      return;
    }

    const emails: FormattedEmail[] = rowsToUse.map((row, idx) => {
      const rowForBody: Record<string, string> = { ...row };
      detectedVars.forEach((key) => {
        const url = dataLinks[idx]?.[key];
        if (url) {
          const text = row[key] ?? "";
          rowForBody[
            key
          ] = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-700">${text}</a>`;
        }
      });
      const bodyHtml = TemplateParser.replacePlaceholders(template, rowForBody);
      return {
        recipientEmail: row.email || "",
        subject: TemplateParser.replacePlaceholders(subject, row),
        body: sanitizeEmailHtml(bodyHtml),
      };
    });

    setGeneratedEmails(emails);
    if (emails.length > 0) {
      setActiveTab("preview");
      toast({
        title: "Success",
        description: `Generated ${emails.length} emails successfully`,
      });
    }
  };

  const htmlToPlainText = (html: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.innerText;
  };

  const sanitizeEmailHtml = (html: string): string => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const all = container.querySelectorAll("*");
    all.forEach((el) => {
      const style = el.getAttribute("style") || "";
      let newStyle = style
        .replace(/background-color\s*:\s*[^;]+;?/gi, "")
        .replace(/background\s*:\s*[^;]+;?/gi, "");
      if (el.tagName.toLowerCase() === "a") {
        const hasColor = /color\s*:/i.test(newStyle);
        const hasUnderline = /text-decoration\s*:/i.test(newStyle);
        if (!hasColor) newStyle = `color:#2563eb;${newStyle}`;
        if (!hasUnderline) newStyle = `text-decoration:underline;${newStyle}`;
      }
      newStyle = newStyle.trim();
      if (newStyle.length > 0) {
        el.setAttribute("style", newStyle);
      } else {
        el.removeAttribute("style");
      }

      const cls = el.getAttribute("class");
      if (cls) {
        const filtered = cls
          .split(/\s+/)
          .filter((c) => !/^bg-/i.test(c))
          .join(" ");
        if (filtered) el.setAttribute("class", filtered);
        else el.removeAttribute("class");
      }
    });
    return container.innerHTML;
  };

  const copyEmail = async (idx: number, email: FormattedEmail) => {
    const cleanedHtml = sanitizeEmailHtml(email.body);
    const plain = htmlToPlainText(cleanedHtml);
    try {
      if (
        navigator.clipboard &&
        "write" in navigator.clipboard &&
        typeof ClipboardItem !== "undefined"
      ) {
        const item = new ClipboardItem({
          "text/html": new Blob([cleanedHtml], { type: "text/html" }),
          "text/plain": new Blob([`Subject: ${email.subject}\n\n${plain}`], {
            type: "text/plain",
          }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(
          `Subject: ${email.subject}\n\n${cleanedHtml}`
        );
      }
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      await navigator.clipboard.writeText(
        `Subject: ${email.subject}\n\n${plain}`
      );
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const copyAllEmails = async () => {
    const cleanedHtml = generatedEmails
      .map((email, idx) => {
        const h = sanitizeEmailHtml(email.body);
        return `<!-- Email ${idx + 1} -->\n<h3>Subject: ${
          email.subject
        }</h3>\n${h}`;
      })
      .join("\n<hr/>\n");
    const plain = generatedEmails
      .map(
        (email, idx) =>
          `--- Email ${idx + 1} ---\n\nSubject: ${
            email.subject
          }\n\n${htmlToPlainText(email.body)}\n\n`
      )
      .join("\n");
    try {
      if (
        navigator.clipboard &&
        "write" in navigator.clipboard &&
        typeof ClipboardItem !== "undefined"
      ) {
        const item = new ClipboardItem({
          "text/html": new Blob([cleanedHtml], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(cleanedHtml);
      }
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      await navigator.clipboard.writeText(plain);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  // Auto-clear preview when there is no data
  useEffect(() => {
    if (!hydrated) return;
    const hasRowData = dataRows.some((row) =>
      Object.values(row).some((v) => (v || "").trim().length > 0)
    );
    if (!hasRowData) {
      if (generatedEmails.length > 0) setGeneratedEmails([]);
      if (activeTab === "preview") setActiveTab("data");
    }
  }, [hydrated, dataRows, activeTab, generatedEmails.length]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Email Formatter</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2">
          <button
            type="button"
            onClick={() => setActiveTab("template")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "template"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            1. Upload & Template
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("data")}
            disabled={detectedVars.length === 0}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "data"
                ? "border-b-4 border-blue-600 text-blue-600"
                : detectedVars.length === 0
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            2. Review Data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            disabled={generatedEmails.length === 0}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "preview"
                ? "border-b-4 border-blue-600 text-blue-600"
                : generatedEmails.length === 0
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            3. Preview & Copy
          </button>
        </div>

        {/* Template Tab */}
        {activeTab === "template" && (
          <div className="space-y-6">
            {/* CSV Upload Section */}
            <CSVUploader
              onFileUpload={handleCSVUpload}
              fileName={fileName}
              onClear={handleClearCSV}
              isLoading={isUploading}
            />

            {/* Show detected variables if CSV uploaded */}
            {detectedVars.length > 0 && (
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-lg mb-3 text-blue-900">
                  ✓ Detected Variables from CSV ({dataRows.length} rows):
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {detectedVars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium shadow-sm hover:bg-blue-700"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-blue-700 font-medium">
                  💡 Use these variables in your template below
                </p>
              </div>
            )}

            {/* Subject input */}
            <div>
              <label className="block font-semibold mb-2 text-lg">
                Email Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                onFocus={() => setSubjectFocused(true)}
                onBlur={() => setSubjectFocused(false)}
                ref={subjectInputRef}
                placeholder="Trademark Application - {{markName}}"
                disabled={!fileName}
                className="w-full p-4 border-2 rounded-lg text-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-sm text-gray-500 mt-1">
                Use {`{{variableName}}`} placeholders
              </p>
            </div>

            {/* Template editor */}
            <div>
              <label className="block font-semibold mb-2 text-lg">
                Email Template <span className="text-red-500">*</span>
              </label>
              <div
                className={!fileName ? "opacity-50 pointer-events-none" : ""}
              >
                <RichTextEditor
                  content={template}
                  onChange={(html) => handleTemplateChange(html)}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  onProvideEditorApi={(api) => setEditorApi(api)}
                />
              </div>
              {!fileName && (
                <p className="text-sm text-orange-600 mt-2 font-medium">
                  ⚠️ Upload CSV file first to enable template editor
                </p>
              )}
            </div>

            {/* Show error if template uses wrong variables */}
            {templateError && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <p className="text-red-700 font-medium">⚠️ {templateError}</p>
              </div>
            )}

            {/* Next button */}
            <button
              type="button"
              onClick={() => setActiveTab("data")}
              disabled={
                !fileName ||
                dataRows.length === 0 ||
                !template ||
                !subject ||
                templateError !== null
              }
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
            >
              Next: Review Data →
            </button>
          </div>
        )}

        {/* Data Input Tab */}
        {activeTab === "data" && (
          <>
            <div className="space-y-4">
              <div className="p-5 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <h3 className="font-bold text-lg mb-2 text-yellow-900">
                  📋 Review & Edit Data
                </h3>
                <p className="text-sm text-yellow-800">
                  Data auto-filled from your CSV. Fields marked{" "}
                  <span className="font-semibold">N/A</span> need manual input
                  before generating emails.
                </p>
              </div>

              <div className="overflow-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold border-b w-16">
                        #
                      </th>
                      {detectedVars.map((key) => (
                        <th
                          key={key}
                          className="px-3 py-3 text-left border-b font-semibold min-w-[180px]"
                        >
                          {key}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-left border-b font-semibold w-32">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="odd:bg-white even:bg-gray-50 hover:bg-blue-50"
                      >
                        <td className="px-3 py-3 border-b text-gray-500 font-medium">
                          {idx + 1}
                        </td>
                        {detectedVars.map((key) => (
                          <td key={key} className="px-3 py-2 border-b">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 ${
                                  row[key] === "N/A"
                                    ? "bg-yellow-50 border-yellow-300 focus:ring-yellow-400"
                                    : "border-gray-300 focus:ring-blue-400"
                                }`}
                                placeholder={`Value for {{${key}}}`}
                                value={row[key] || ""}
                                onChange={(e) =>
                                  updateCell(idx, key, e.target.value)
                                }
                              />
                              <button
                                type="button"
                                onClick={() => openLinkModal(idx, key)}
                                className="px-2 py-2 text-sm border rounded-md hover:bg-gray-100 flex-shrink-0"
                                title="Add/Edit link"
                              >
                                🔗
                              </button>
                              {dataLinks[idx]?.[key] && (
                                <span
                                  className="text-xs text-green-600 font-medium flex-shrink-0"
                                  title={dataLinks[idx][key]}
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                          </td>
                        ))}
                        <td className="px-3 py-2 border-b text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors text-gray-600 font-medium"
              >
                + Add Row
              </button>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("template")}
                  className="px-6 py-3 border-2 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={templateError !== null}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold text-lg transition-colors"
                >
                  Generate {dataRows.length} Emails ✉️
                </button>
              </div>
            </div>

            {/* Link Editor Modal */}
            {linkEditor.open && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                  <h4 className="text-lg font-bold mb-4">
                    Add link for {linkEditor.key}
                  </h4>
                  <input
                    type="url"
                    value={linkEditor.url}
                    onChange={(e) =>
                      setLinkEditor((prev) => ({
                        ...prev,
                        url: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/path"
                    className="w-full p-3 border-2 rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 border-2 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                      onClick={clearLink}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 border-2 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                      onClick={closeLinkModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                      onClick={saveLink}
                    >
                      Save Link
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <h2 className="text-2xl font-bold text-green-900">
                ✓ Generated {generatedEmails.length} Emails
              </h2>
              <button
                type="button"
                onClick={copyAllEmails}
                className={`px-6 py-3 text-white rounded-lg font-semibold transition-colors ${
                  copiedAll
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {copiedAll ? "✓ Copied All!" : "📋 Copy All Emails"}
              </button>
            </div>

            <div className="space-y-4">
              {generatedEmails.map((email, index) => (
                <div
                  key={index}
                  className="border-2 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Email #{index + 1}
                      </p>
                      {email.recipientEmail && (
                        <p className="font-bold text-lg">
                          To: {email.recipientEmail}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyEmail(index, email)}
                      className={`px-5 py-2 text-white text-sm rounded-lg font-medium transition-colors ${
                        copiedIndex === index
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {copiedIndex === index ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-1">
                        Subject:
                      </p>
                      <p className="font-semibold text-lg">{email.subject}</p>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-2">
                        Body:
                      </p>
                      <div
                        className="text-sm bg-gray-50 p-4 rounded-lg border [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-700"
                        dangerouslySetInnerHTML={{ __html: email.body }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("data")}
              className="px-6 py-3 border-2 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              ← Back to Edit
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
