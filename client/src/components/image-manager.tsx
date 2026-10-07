"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface ImageManagerProps {
  onImageInsert: (imageData: ImageData) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface ImageData {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  alignment: "left" | "center" | "right" | "none";
  title?: string;
}

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

const ImageManager = ({
  onImageInsert,
  onClose,
  isOpen,
}: ImageManagerProps) => {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageDimensions, setImageDimensions] =
    useState<ImageDimensions | null>(null);
  const [imageData, setImageData] = useState<ImageData>({
    src: "",
    alt: "",
    width: undefined,
    height: undefined,
    alignment: "none",
    title: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"url" | "upload">("url");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setImageUrl("");
    setImageFile(null);
    setImagePreview("");
    setImageDimensions(null);
    setImageData({
      src: "",
      alt: "",
      width: undefined,
      height: undefined,
      alignment: "none",
      title: "",
    });
    setError("");
    setIsLoading(false);
  };

  // Handle image URL input
  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setError("");

    if (url.trim()) {
      loadImageFromUrl(url.trim());
    } else {
      setImagePreview("");
      setImageDimensions(null);
    }
  };

  // Load image from URL and get dimensions
  const loadImageFromUrl = useCallback((url: string) => {
    setIsLoading(true);

    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      setImagePreview(url);
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
      setImageData((prev) => ({
        ...prev,
        src: url,
        width: Math.min(img.naturalWidth, 600), // Max width for email
        height: Math.min(img.naturalHeight, 400), // Max height for email
      }));
      setIsLoading(false);
      setError("");
    };

    img.onerror = () => {
      setError("Failed to load image. Please check the URL and try again.");
      setImagePreview("");
      setImageDimensions(null);
      setIsLoading(false);
    };

    img.src = url;
  }, []);

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    // Check file size (max 5MB for email compatibility)
    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image file is too large. Please choose a file smaller than 5MB."
      );
      return;
    }

    setImageFile(file);
    setError("");
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);

      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
        });
        setImageData((prev) => ({
          ...prev,
          src: result,
          width: Math.min(img.naturalWidth, 600),
          height: Math.min(img.naturalHeight, 400),
        }));
        setIsLoading(false);
      };
      img.src = result;
    };

    reader.onerror = () => {
      setError("Failed to read the image file.");
      setIsLoading(false);
    };

    reader.readAsDataURL(file);
  };

  // Handle dimension changes while maintaining aspect ratio
  const handleDimensionChange = (
    dimension: "width" | "height",
    value: number
  ) => {
    if (!imageDimensions) return;

    const newImageData = { ...imageData };

    if (dimension === "width") {
      newImageData.width = value;
      newImageData.height = Math.round(value / imageDimensions.aspectRatio);
    } else {
      newImageData.height = value;
      newImageData.width = Math.round(value * imageDimensions.aspectRatio);
    }

    setImageData(newImageData);
  };

  // Reset to original dimensions
  const resetDimensions = () => {
    if (imageDimensions) {
      setImageData((prev) => ({
        ...prev,
        width: Math.min(imageDimensions.width, 600),
        height: Math.min(imageDimensions.height, 400),
      }));
    }
  };

  // Handle image insertion
  const handleInsert = () => {
    if (!imageData.src) {
      setError("Please select an image first.");
      return;
    }

    if (!imageData.alt.trim()) {
      setError("Please provide alt text for accessibility.");
      return;
    }

    onImageInsert(imageData);
    onClose();
  };

  // Generate email-safe image HTML
  const generateImageHTML = (): string => {
    const styles = [];

    if (imageData.width) styles.push(`width: ${imageData.width}px`);
    if (imageData.height) styles.push(`height: ${imageData.height}px`);

    switch (imageData.alignment) {
      case "left":
        styles.push("float: left", "margin: 0 10px 10px 0");
        break;
      case "right":
        styles.push("float: right", "margin: 0 0 10px 10px");
        break;
      case "center":
        styles.push("display: block", "margin: 10px auto");
        break;
      default:
        styles.push("margin: 10px 0");
    }

    return `<img src="${imageData.src}" alt="${imageData.alt}" ${
      imageData.title ? `title="${imageData.title}"` : ""
    } style="${styles.join("; ")}" />`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Insert Image</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex mb-6 border-b">
            <button
              onClick={() => setActiveTab("url")}
              className={`px-4 py-2 font-medium ${
                activeTab === "url"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              From URL
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 font-medium ${
                activeTab === "upload"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Upload File
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Image Source */}
            <div>
              {activeTab === "url" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a direct link to an image (JPG, PNG, GIF, WebP)
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <div className="text-center">
                      <div className="text-3xl text-gray-400 mb-2">📁</div>
                      <p className="text-sm text-gray-600">
                        Click to select an image file
                      </p>
                      <p className="text-xs text-gray-500">Max size: 5MB</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                  {imageFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {imageFile.name}
                    </p>
                  )}
                </div>
              )}

              {/* Image Properties */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alt Text (Required)
                  </label>
                  <input
                    type="text"
                    value={imageData.alt}
                    onChange={(e) =>
                      setImageData((prev) => ({ ...prev, alt: e.target.value }))
                    }
                    placeholder="Describe the image for accessibility"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={imageData.title}
                    onChange={(e) =>
                      setImageData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Tooltip text when hovering"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alignment
                  </label>
                  <select
                    value={imageData.alignment}
                    onChange={(e) =>
                      setImageData((prev) => ({
                        ...prev,
                        alignment: e.target.value as
                          | "left"
                          | "center"
                          | "right"
                          | "none",
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="none">None</option>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                {imageDimensions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dimensions
                    </label>
                    <div className="flex gap-2 items-center">
                      <div>
                        <label className="block text-xs text-gray-500">
                          Width
                        </label>
                        <input
                          type="number"
                          value={imageData.width || ""}
                          onChange={(e) =>
                            handleDimensionChange(
                              "width",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <span className="text-gray-400 mt-4">×</span>
                      <div>
                        <label className="block text-xs text-gray-500">
                          Height
                        </label>
                        <input
                          type="number"
                          value={imageData.height || ""}
                          onChange={(e) =>
                            handleDimensionChange(
                              "height",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <button
                        onClick={resetDimensions}
                        className="mt-4 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Original: {imageDimensions.width} ×{" "}
                      {imageDimensions.height}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="border border-gray-300 rounded-md p-4 bg-gray-50 min-h-64">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : imagePreview ? (
                  <div className="text-center">
                    <Image
                      src={imagePreview}
                      alt={imageData.alt || "Preview"}
                      width={imageData.width || 600}
                      height={imageData.height || 400}
                      style={{
                        width: imageData.width
                          ? `${imageData.width}px`
                          : "auto",
                        height: imageData.height
                          ? `${imageData.height}px`
                          : "auto",
                        maxWidth: "100%",
                        maxHeight: "300px",
                      }}
                      className={`
                        ${imageData.alignment === "center" ? "mx-auto" : ""}
                        ${imageData.alignment === "left" ? "mr-auto" : ""}
                        ${imageData.alignment === "right" ? "ml-auto" : ""}
                      `}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p>Image preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* HTML Preview */}
              {imagePreview && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated HTML
                  </label>
                  <textarea
                    value={generateImageHTML()}
                    readOnly
                    className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!imagePreview || !imageData.alt.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageManager;
