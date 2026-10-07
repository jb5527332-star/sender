import { FormattedEmail } from "@/interfaces/template-interface";

// Escape special regex characters in a string
const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class TemplateParser {
  static extractPlaceholders(content: string): string[] {
    const regexDouble = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
    const regexSingle = /\{\s*([A-Za-z0-9_.-]+)\s*\}/g;
    const keys: string[] = [];
    for (const m of content.matchAll(regexDouble)) {
      if (m[1]) keys.push(m[1].trim());
    }
    for (const m of content.matchAll(regexSingle)) {
      if (m[1]) keys.push(m[1].trim());
    }
    return Array.from(new Set(keys));
  }

  static replacePlaceholders(
    template: string,
    data: Record<string, string>
  ): string {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
      const safeKey = escapeRegExp(key.trim());
      // Replace {{key}} or {key}, case-insensitive, with optional spaces
      const patterns = [
        new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, "gi"),
        new RegExp(`\\{\\s*${safeKey}\\s*\\}`, "gi"),
      ];
      patterns.forEach((re) => {
        result = result.replace(re, value ?? "");
      });
    });
    return result;
  }

  static generateEmails(
    template: string,
    subject: string,
    dataRows: Record<string, string>[]
  ): FormattedEmail[] {
    return dataRows.map((row) => ({
      recipientEmail: row.email || "",
      subject: this.replacePlaceholders(subject, row),
      body: this.replacePlaceholders(template, row),
    }));
  }

  static validateTemplate(
    template: string,
    allowedVariables: string[]
  ): { valid: boolean; invalidVars: string[] } {
    const usedVars = this.extractPlaceholders(template);
    const invalidVars = usedVars.filter((v) => !allowedVariables.includes(v));
    return {
      valid: invalidVars.length === 0,
      invalidVars,
    };
  }
}
