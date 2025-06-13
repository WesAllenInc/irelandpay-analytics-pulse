import React, { useRef, useState } from "react";
import { FiUpload, FiCheckCircle, FiXCircle, FiFile, FiDownload } from "react-icons/fi";

export interface UploadZoneProps {
  acceptedFormats: string[];
  maxFileSize: number;
  onUpload: (file: File) => Promise<void>;
  showProgress?: boolean;
  multiple?: boolean;
}

const steps = [
  "Validating file",
  "Uploading to storage",
  "Processing data",
  "Updating dashboard",
];

export default function EnhancedUpload({
  acceptedFormats = [".xlsx", ".xls", ".csv"],
  maxFileSize = 10 * 1024 * 1024,
  onUpload,
  showProgress = true,
  multiple = false,
}: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStep, setUploadStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      acceptedFormats.some((ext) => file.name.endsWith(ext))
    );
    if (files.length) handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    setSelectedFiles(files);
    setProgress(0);
    setUploadStep(0);
    setError(null);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setProgress(0);
    setUploadStep(0);
    setError(null);
    setSuccess(false);
    try {
      for (let step = 0; step < steps.length; step++) {
        setUploadStep(step);
        setProgress(Math.round((step / steps.length) * 100));
        if (step === 0) {
          // Validate
          for (const file of selectedFiles) {
            if (file.size > maxFileSize) throw new Error("File too large");
            if (!acceptedFormats.some((ext) => file.name.endsWith(ext))) throw new Error("Invalid file format");
          }
        }
        if (step === 1) {
          // Upload
          for (const file of selectedFiles) {
            await onUpload(file);
          }
        }
        await new Promise((res) => setTimeout(res, 400)); // Simulate processing
      }
      setProgress(100);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      <div
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors duration-200 cursor-pointer ${
          dragActive ? "border-primary bg-primary/10" : "border-gray-300 bg-gray-50 dark:bg-gray-800"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        tabIndex={0}
        aria-label="File upload drop zone"
        onClick={() => inputRef.current?.click()}
      >
        <FiUpload size={36} className="text-primary mb-2" />
        <p className="text-lg font-semibold mb-1">Drag & drop to upload</p>
        <p className="text-sm text-muted-foreground mb-2">or click to select files</p>
        <input
          ref={inputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          multiple={multiple}
          className="hidden"
          title="Upload files"
          placeholder="Choose files to upload"
          aria-label="File upload input"
          onChange={(e) => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
          }}
        />
        <p className="text-xs text-muted-foreground">Accepted: {acceptedFormats.join(", ")}, Max size: {Math.round(maxFileSize / 1024 / 1024)}MB</p>
      </div>

      {/* File Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, idx) => (
            <div key={file.name + idx} className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded px-3 py-2">
              <FiFile className="text-primary" />
              <div className="flex-1">
                <div className="font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {file.type || "Unknown type"} • {Math.round(file.size / 1024)} KB
                </div>
              </div>
              <button
                className="ml-2 text-danger hover:text-danger-dark"
                aria-label="Remove file"
                onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
              >
                <FiXCircle />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Step Indicator & Progress */}
      {uploading && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${idx <= uploadStep ? "bg-primary" : "bg-gray-300"}`} />
                {idx < steps.length - 1 && <span className="w-6 h-0.5 bg-gray-300" />}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground mb-2">{steps[uploadStep]}</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs mt-1">{progress}%</div>
        </div>
      )}

      {/* Success/Error Animations */}
      {success && (
        <div className="mt-4 flex items-center gap-2 text-success animate-bounceIn">
          <FiCheckCircle size={22} /> Upload successful!
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-danger animate-shake">
          <FiXCircle size={22} /> {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark disabled:opacity-50"
          onClick={handleUpload}
          disabled={uploading || !selectedFiles.length}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded border border-primary text-primary hover:bg-primary/10"
          onClick={() => window.open("/templates/irelandpay-template.xlsx", "_blank")}
          type="button"
        >
          <FiDownload /> Download Template
        </button>
      </div>
    </div>
  );
}
