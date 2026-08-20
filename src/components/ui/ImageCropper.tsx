import { useState, useCallback, useRef } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, Check } from "lucide-react";
import getCroppedImg from "@/lib/cropImage";
import { createPortal } from "react-dom";
import { useDialogAccessibility } from "./Dialog";

interface ImageCropperProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (base64Data: string, mimeType: string) => void;
  mimeType?: string;
}

export default function ImageCropper({
  imageSrc,
  onClose,
  onCropComplete,
  mimeType = "image/jpeg",
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogAccessibility({
    isOpen: true,
    onClose,
    initialFocusRef: cancelRef,
  });

  const onCropCompleteHandler = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (croppedImage) {
        onCropComplete(croppedImage.data, mimeType);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-cropper-title"
      tabIndex={-1}
    >
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh]">
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <h3
            id="image-cropper-title"
            className="text-base sm:text-lg font-bold text-zinc-50"
          >
            Crop Photo
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close image cropper"
            className="min-h-11 min-w-11 p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="relative w-full h-[min(300px,42dvh)] sm:h-[400px] bg-zinc-950 shrink-0">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-6 space-y-6 shrink-0 bg-zinc-950 border-t border-zinc-900">
          <div>
            <label
              htmlFor="image-cropper-zoom"
              className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-3"
            >
              Zoom
            </label>
            <input
              id="image-cropper-zoom"
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => {
                setZoom(Number(e.target.value));
              }}
              className="w-full accent-accent h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
          </div>
          <div className="flex gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-xl border border-zinc-800 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              aria-label={isProcessing ? "Saving cropped photo" : undefined}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-zinc-50 text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-inner shadow-zinc-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-zinc-50/20 border-t-zinc-50 rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Photo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
