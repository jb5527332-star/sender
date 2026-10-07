"use client";

import React, { useState, useRef, useCallback } from "react";

interface FileAttachmentProps {
  attachments: AttachmentFile[];
  onAttachmentsChange: (attachments: AttachmentFile[]) => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowedTypes?: string[];
}

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  uploadProgress?: number;
  error?: string;
}

const FileAttachment = ({
  attachments,
  onAttachmentsChange,
  maxFileSize = 25 * 1024 * 1024, // 25MB default
  maxFiles = 10,
  allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Other
    'application/json',
    'application/xml',
    'text/xml'
  ]
}: FileAttachmentProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  // const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type icon
  const getFileIcon = (type: string, name: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return '📝';
    if (type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) return '📊';
    if (type.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) return '📈';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '🗜️';
    if (type.includes('text') || type.includes('csv')) return '📋';
    if (type.includes('json') || type.includes('xml')) return '⚙️';
    return '📎';
  };

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      // Also check by extension for some common types
      const extension = file.name.toLowerCase().split('.').pop();
      const extensionMap: { [key: string]: string } = {
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'json': 'application/json',
        'xml': 'application/xml'
      };

      if (!extension || !allowedTypes.includes(extensionMap[extension])) {
        return 'File type not allowed';
      }
    }

    // Check total number of files
    if (attachments.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    // Check for duplicate names
    if (attachments.some(att => att.name === file.name)) {
      return 'File with this name already attached';
    }

    return null;
  }, [maxFileSize, allowedTypes, attachments, maxFiles]);

  // Add files
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: AttachmentFile[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        const attachment: AttachmentFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          uploadProgress: 0
        };
        newAttachments.push(attachment);
      }
    });

    if (errors.length > 0) {
      // Show errors to user (you might want to use a toast notification here)
      // console.error('File attachment errors:', errors);
      alert('Some files could not be attached:\n' + errors.join('\n'));
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }
  }, [attachments, onAttachmentsChange, validateFile]);

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    onAttachmentsChange(attachments.filter(att => att.id !== id));
  }, [attachments, onAttachmentsChange]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  };

  // Calculate total size
  const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <div className="flex flex-col items-center">
          <div className="text-4xl mb-2">📎</div>
          <p className="text-lg font-medium text-gray-700 mb-1">
            Attach Files
          </p>
          <p className="text-sm text-gray-500 mb-2">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Max {formatFileSize(maxFileSize)} per file, {maxFiles} files total
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept={allowedTypes.join(',')}
      />

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              Attachments ({attachments.length}/{maxFiles})
            </h3>
            <span className="text-xs text-gray-500">
              Total: {formatFileSize(totalSize)}
            </span>
          </div>

          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <span className="text-2xl mr-3">
                    {getFileIcon(attachment.type, attachment.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.size)}</span>
                      <span>•</span>
                      <span className="capitalize">
                        {attachment.type.split('/')[1] || 'Unknown'}
                      </span>
                    </div>
                    {attachment.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {attachment.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {typeof attachment.uploadProgress === 'number' && attachment.uploadProgress < 100 && (
                  <div className="flex items-center mr-3">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${attachment.uploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {attachment.uploadProgress}%
                    </span>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(attachment.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove attachment"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Attachment Summary */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">
                📎 {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
              </span>
              <span className="text-blue-600 font-medium">
                {formatFileSize(totalSize)}
              </span>
            </div>
            {totalSize > 10 * 1024 * 1024 && (
              <p className="text-xs text-blue-600 mt-1">
                ⚠️ Large attachments may take longer to send and could be blocked by some email providers
              </p>
            )}
          </div>
        </div>
      )}

      {/* Allowed File Types */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            Supported file types
          </summary>
          <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-1">
            <div>
              <strong>Documents:</strong> PDF, Word, Excel, PowerPoint, Text, CSV
            </div>
            <div>
              <strong>Images:</strong> JPEG, PNG, GIF, WebP, SVG
            </div>
            <div>
              <strong>Archives:</strong> ZIP, RAR, 7Z
            </div>
            <div>
              <strong>Data:</strong> JSON, XML
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default FileAttachment;