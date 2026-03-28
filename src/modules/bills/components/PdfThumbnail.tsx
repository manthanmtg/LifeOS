"use client";

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// Prevent CSS loading errors by importing the required CSS (even though we disable the layers)
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker for Next.js compatibility in browser only
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfThumbnailProps {
  base64Data: string;
  className?: string;
  isListRow?: boolean;
}

export default function PdfThumbnail({
  base64Data,
  className,
  isListRow,
}: PdfThumbnailProps) {
  const [error, setError] = useState(false);

  const file = useMemo(() => {
    try {
      const binary = atob(base64Data);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return { data: array };
    } catch {
      return null;
    }
  }, [base64Data]);

  if (!file || error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-zinc-800/50 border-b border-zinc-800",
          className,
        )}
      >
        <FileText
          className={
            isListRow
              ? "w-4 h-4 text-danger/80"
              : "w-10 h-10 text-danger/70 mb-2"
          }
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden flex items-center justify-center bg-zinc-800",
        className,
      )}
    >
      <Document
        file={file}
        loading={<div className="animate-pulse bg-zinc-800 w-full h-full" />}
        error={() => {
          setError(true);
          return null;
        }}
      >
        <Page
          pageNumber={1}
          width={isListRow ? 80 : 400} // Render width scale
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"
        />
      </Document>
    </div>
  );
}
