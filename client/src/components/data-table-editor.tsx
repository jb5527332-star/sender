"use client";

import { Pencil, Trash2 } from "lucide-react";

interface DataTableEditorProps {
  headers: string[];
  data: Record<string, string>[];
  onDataChange: (index: number, field: string, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
}

export default function DataTableEditor({
  headers,
  data,
  onDataChange,
  onAddRow,
  onRemoveRow,
}: DataTableEditorProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left w-16 font-semibold">#</th>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border p-3 text-left min-w-[180px] font-semibold"
                >
                  {header}
                </th>
              ))}
              <th className="border p-3 text-left w-24 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border p-3 text-gray-500 font-medium">
                  {index + 1}
                </td>
                {headers.map((header) => (
                  <td key={header} className="border p-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row[header] || ""}
                        onChange={(e) =>
                          onDataChange(index, header, e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          row[header] === "N/A"
                            ? "bg-yellow-50 border-yellow-300 focus:ring-yellow-400"
                            : "border-gray-300 focus:ring-blue-400"
                        }`}
                        placeholder="Enter value"
                      />
                      {row[header] === "N/A" && (
                        <Pencil className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                ))}
                <td className="border p-3 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-md transition-colors"
                    title="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAddRow}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors text-gray-600 font-medium"
      >
        + Add Row
      </button>
    </div>
  );
}
