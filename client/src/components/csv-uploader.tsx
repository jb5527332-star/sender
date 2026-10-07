"use client";

import { useRef } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";

interface CSVUploaderProps {
  onFileUpload: (file: File) => void;
  fileName: string | null;
  onClear: () => void;
  isLoading: boolean;
}

export default function CSVUploader({
  onFileUpload,
  fileName,
  onClear,
  isLoading,
}: CSVUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-blue-50">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {!fileName ? (
        <div className="text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-blue-400 mb-3" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            <Upload className="inline mr-2 h-5 w-5" />
            {isLoading ? "Processing..." : "Upload CSV/Excel Data File"}
          </button>
          <p className="text-sm text-gray-600 mt-3">
            Upload your data file first to auto-detect variables
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            <div>
              <span className="font-semibold text-green-800">{fileName}</span>
              <p className="text-xs text-green-600">
                File uploaded successfully
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="p-2 hover:bg-red-100 rounded-full transition-colors"
            title="Remove file"
          >
            <X className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}
    </div>
  );
}
