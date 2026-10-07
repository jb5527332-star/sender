export interface TemplateVariable {
  name: string;
  value: string;
}

export interface FormattedEmail {
  subject: string;
  body: string;
  recipientEmail: string;
}

export interface TemplateData {
  template: string;
  subject: string;
  dataRows: Record<string, string>[]; 
}

export interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}