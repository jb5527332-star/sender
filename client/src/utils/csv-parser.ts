import Papa from "papaparse";

export interface CSVParseResult {
  headers: string[];
  data: Record<string, string>[];
  rowCount: number;
}

export class CSVParser {
  static async parseFile(file: File): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
      // Check if it's an Excel file
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

      if (isExcel) {
        // For Excel files, we need to handle differently
        reject(
          new Error(
            "Please save your Excel file as CSV format before uploading. In Excel: File > Save As > CSV (Comma delimited)"
          )
        );
        return;                                               
      }

      file
        .text()
        .then((text) => {
          Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          // Clean up header names - remove extra spaces, special chars
          return header
            .trim()
            .replace(/\s+/g, " ") // Replace multiple spaces with single space
            .replace(/[^\w\s]/g, "") // Remove special characters except spaces
            .replace(/\s+/g, "_"); // Replace spaces with underscores for placeholder safety
        },
        transform: (value: string) => {
          // Trim all cell values
          return value?.trim() || "";
        },
        complete: (results) => {
          // Get headers from meta fields
          const headers = results.meta.fields || [];

          // Filter out empty headers
          const validHeaders = headers.filter((h) => h && h.length > 0);

          if (validHeaders.length === 0) {
            reject(
              new Error(
                "No valid headers found in CSV file. Make sure first row contains column names."
              )
            );
            return;
          }

          const data = results.data as Record<string, string>[];

          // Process data rows - fill empty values with N/A
          const processedData = data
            .filter((row) => {
              // Filter out completely empty rows
              return Object.values(row).some(
                (val) => val && val.trim().length > 0
              );
            })
            .map((row) => {
              const processedRow: Record<string, string> = {};
              validHeaders.forEach((header) => {
                const value = row[header]?.trim();
                processedRow[header] =
                  value && value.length > 0 ? value : "N/A";
              });
              return processedRow;
            });

          if (processedData.length === 0) {
            reject(
              new Error(
                "No data rows found in CSV file. Make sure your file has data below the header row."
              )
            );
            return;
          }

          resolve({
            headers: validHeaders,
            data: processedData,
            rowCount: processedData.length,
          });
        },
        error: (error: unknown) => {
          console.error("CSV Parse Error:", error);
          const msg = (error as { message?: string })?.message || "Unknown error";
          reject(new Error(`Failed to parse CSV: ${msg}`));
        },
      });
        })
        .catch((err) => {
          reject(
            new Error(
              `Failed to read file: ${err instanceof Error ? err.message : String(
                err
              )}`
            )
          );
        });
    });
  }
}
