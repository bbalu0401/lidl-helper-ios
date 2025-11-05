
import React, { useState, useRef, useCallback, useEffect } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Camera, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FileUploadWithOCR({ onExtracted, jsonSchema, title = "Beosztás feltöltése", initialFile }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [progress, setProgress] = useState("");
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const processFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress("Feltöltés...");
    
    try {
      const processingPromises = Array.from(files).map(async (file, index) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            return null;
        }

        setProgress(`Feltöltés... (${index + 1}/${files.length})`);
        const { file_url } = await supabaseClient.integrations.Core.UploadFile({ file });
        
        setProgress(`OCR... (${index + 1}/${files.length}) - 1-2 perc`);
        
        const result = await supabaseClient.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: jsonSchema
        });
        
        if (result.status === "success" && result.output) {
          return { output: result.output, imageUrl: file_url };
        } else {
          console.warn(`OCR failed:`, result);
          return null; 
        }
      });

      const results = await Promise.all(processingPromises);
      const validResults = results.filter(r => r !== null); 

      if (validResults.length > 0) {
        setProgress("Sikeres!");
        onExtracted(validResults);
        setIsProcessing(false);
        setProgress("");
      } else {
        setError("Nem sikerült beolvasni. Próbálj élesebb képet vagy tördeld kisebb részekre!");
        setIsProcessing(false);
        setProgress("");
      }
      
    } catch (err) {
      console.error("Error:", err);
      setError("Hiba történt! " + (err.message || ""));
      setIsProcessing(false);
      setProgress("");
    }
  }, [onExtracted, jsonSchema]);

  useEffect(() => {
    if (initialFile) {
        setIsProcessing(true);
        setError(null);
        setProgress("Feldolgozás...");
        (async () => {
            try {
                const result = await supabaseClient.integrations.Core.ExtractDataFromUploadedFile({
                    file_url: initialFile.fileUrl,
                    json_schema: jsonSchema
                });
                if (result.status === "success" && result.output) {
                    onExtracted([{ output: result.output, imageUrl: initialFile.fileUrl }]);
                } else {
                     onExtracted([]);
                }
            } catch (err) {
                 onExtracted([]);
            } finally {
                setIsProcessing(false);
                setProgress("");
            }
        })();
    }
  }, [initialFile, onExtracted, jsonSchema]);


  if (initialFile) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">{progress || "Feldolgozás..."}</span>
        </div>
    );
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleCameraSelect = (e) => {
    processFiles(e.target.files);
  };
  
  const openFileDialog = () => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`relative p-6 py-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors bg-background
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input 
            ref={fileInputRef} 
            type="file" 
            className="hidden" 
            multiple 
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            disabled={isProcessing}
        />
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">{progress}</span>
            <span className="text-xs text-muted-foreground">Kérlek várj, a feldolgozás nagyobb képeknél akár több percig is tarthat...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Upload className="w-8 h-8 text-muted-foreground/80" />
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground/80">Kép vagy PDF fájlok</p>
            <p className="text-xs text-muted-foreground/60">A feldolgozás több percig is tarthat</p>
          </div>
        )}
      </div>
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraSelect}
        className="hidden"
        disabled={isProcessing}
      />
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => cameraInputRef.current?.click()}
        disabled={isProcessing}
      >
        <Camera className="w-4 h-4" />
        Fotó készítése kamerával
      </Button>
    </div>
  );
}
