"use client";

import React, { useRef, useState } from "react";

import { AttachmentUploaderProps } from "@/interfaces/components-interface";

import { useToast } from "@/components/toast";

import { useLogger } from "@/utils/logger";

export default function AttachmentUploader({
  onAttachmentsChange,
  attachments,
  showSelectedList = true,
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { addLogEntry } = useLogger();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (fileList: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    fileList.forEach((file) => {
      // Check if file is already in the list by name
      const isDuplicate = attachments.some((f) => f.name === file.name);
      if (isDuplicate) {
        invalidFiles.push(`${file.name} (duplicate)`);
        return;
      }

      // Check file type - support common document and image formats
      const validTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg", 
        "image/png",
        "image/gif",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/x-zip-compressed",
        "text/calendar" // for .ics files
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB (increased from 5MB)

      // Check file extension as fallback for file type validation
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const validExtensions = [
        'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'txt', 'csv', 'zip', 'ics'
      ];

      const isValidType = validTypes.includes(file.type) || 
                         (fileExtension && validExtensions.includes(fileExtension));

      if (!isValidType) {
        addLogEntry(`File type not supported: ${file.name}`, "error");
        invalidFiles.push(`${file.name} (invalid type)`);
        return;
      }

      if (file.size > maxSize) {
        addLogEntry(`File too large (max 10MB): ${file.name}`, "error");
        invalidFiles.push(`${file.name} (too large)`);
        return;
      }

      validFiles.push(file);
      addLogEntry(`File added: ${file.name}`, "info");
    });

    if (validFiles.length > 0) {
      onAttachmentsChange([...attachments, ...validFiles]);
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were not added",
        description: invalidFiles.join(", "),
        variant: "destructive",
      });
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    addLogEntry(`File removed: ${newAttachments[index].name}`, "info");
    newAttachments.splice(index, 1);
    onAttachmentsChange(newAttachments);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType === "application/pdf") return "📄";
    if (fileType.startsWith("image/")) return "🖼️";
    return "📎";
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">Attachments</label>

      <div
        onClick={triggerFileInput}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer transition-colors
          ${
            isDragging
              ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
              : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
          }`}
     >
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex text-sm text-gray-600 dark:text-gray-400">
            <label className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
              <span>Upload files</span>
              <input
                id="file-upload"
                ref={fileInputRef}
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.ics,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.*,text/*,application/zip,text/calendar"
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">Documents, Images, Archives up to 10MB</p>
        </div>
      </div>

      {/* Selected files list */}
      {showSelectedList && attachments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {attachments.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
              >
                <div className="flex items-center overflow-hidden">
                  <span className="mr-2">{getFileIcon(file.type)}</span>
                  <span className="truncate max-w-[250px]">{file.name}</span>
                  <span className="ml-2 text-gray-500 text-xs whitespace-nowrap">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700 ml-2 text-lg font-medium"
                  aria-label="Remove file"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
