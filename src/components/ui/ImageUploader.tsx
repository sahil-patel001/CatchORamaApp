import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, X } from "lucide-react";

interface ImageUploaderProps {
  onFileChange: (file: File | null) => void;
  existingImageUrl?: string | null;
}

export function ImageUploader({
  onFileChange,
  existingImageUrl,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(
    existingImageUrl || null
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onFileChange(file);
        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);
      }
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".gif", ".jpg"] },
    multiple: false,
  });

  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setPreview(null);
    onFileChange(null);
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
  };

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ease-in-out
        ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-gray-300 hover:border-primary"
        }`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <>
          <img
            src={preview}
            alt="Product Preview"
            className="mx-auto max-h-48 rounded-md"
          />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-background/50 rounded-full p-1 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
          <Camera className="h-10 w-10" />
          {isDragActive ? (
            <p>Drop the image here ...</p>
          ) : (
            <p>Drag & drop an image here, or click to select one</p>
          )}
          <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
        </div>
      )}
    </div>
  );
}
