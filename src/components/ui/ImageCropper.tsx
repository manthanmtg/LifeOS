import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import getCroppedImg from "@/lib/cropImage";
import { createPortal } from "react-dom";

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6"
      >
        <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-full">
          <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-zinc-50">
              Crop Photo
            </h3>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="relative w-full h-[300px] sm:h-[400px] bg-black shrink-0">
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

          <div className="p-6 space-y-6 shrink-0">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">
                Zoom
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => {
                  setZoom(Number(e.target.value));
                }}
                className="w-full accent-accent h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-inner shadow-white/20"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
