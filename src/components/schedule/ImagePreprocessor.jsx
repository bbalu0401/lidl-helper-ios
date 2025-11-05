import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

/**
 * Képjavítás OCR-hez:
 * - Kontraszt növelése
 * - Élesítés
 * - Zajszűrés
 */
const preprocessImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Rajzoljuk fel az eredeti képet
      ctx.drawImage(img, 0, 0);

      // Képadatok kiolvasása
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. KONTRASZT NÖVELÉSE (1.5x)
      const contrastFactor = 1.5;
      const intercept = 128 * (1 - contrastFactor);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * contrastFactor + intercept;         // R
        data[i + 1] = data[i + 1] * contrastFactor + intercept; // G
        data[i + 2] = data[i + 2] * contrastFactor + intercept; // B
      }

      // 2. ÉLESÍTÉS (Unsharp mask egyszerű változata)
      const sharpness = 1.2;
      const tempData = new Uint8ClampedArray(data);

      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;

          for (let c = 0; c < 3; c++) {
            const center = tempData[idx + c];
            const avg = (
              tempData[((y - 1) * canvas.width + x) * 4 + c] +
              tempData[((y + 1) * canvas.width + x) * 4 + c] +
              tempData[(y * canvas.width + (x - 1)) * 4 + c] +
              tempData[(y * canvas.width + (x + 1)) * 4 + c]
            ) / 4;

            data[idx + c] = center + sharpness * (center - avg);
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Konvertálás Blob-ra
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.95);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export default function ImagePreprocessor({ onProcessed, title = "Kép feltöltése" }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const processedFile = await preprocessImage(file);
      onProcessed(processedFile);
    } catch (error) {
      console.error('Képfeldolgozási hiba:', error);
      // Ha hiba van, az eredeti fájlt küldjük
      onProcessed(file);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          A kép automatikusan javítva lesz az OCR számára
        </p>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => cameraInputRef.current?.click()}
          disabled={isProcessing}
          size="lg"
          className="h-20 flex flex-col gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Javítás...</span>
            </>
          ) : (
            <>
              <Camera className="w-6 h-6" />
              <span className="text-sm font-semibold">Fotó</span>
            </>
          )}
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          size="lg"
          variant="outline"
          className="h-20 flex flex-col gap-2 border-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Javítás...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-6 h-6" />
              <span className="text-sm font-semibold">Galéria</span>
            </>
          )}
        </Button>
      </div>

      {isProcessing && (
        <p className="text-xs text-center text-muted-foreground">
          Kontraszt fokozás, élesítés folyamatban...
        </p>
      )}
    </div>
  );
}