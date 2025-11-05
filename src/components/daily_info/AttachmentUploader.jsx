
import React, { useState, useCallback, useRef } from 'react';
import { supabaseClient } from '@/api/supabaseClient';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, File, X, Loader2, Camera } from 'lucide-react';

export default function AttachmentUploader({ selectedDate, onUploadComplete }) {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileSelected = (selectedFile) => {
        if (selectedFile) {
            setFile(selectedFile);
            const nameWithoutExtension = selectedFile.name.split('.').slice(0, -1).join('.');
            setTitle(nameWithoutExtension);
        }
    };
    
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelected(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !title.trim()) {
            setError("Kérlek, válassz egy fájlt és adj meg egy címet.");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const { file_url } = await supabaseClient.integrations.Core.UploadFile({ file });
            
            const attachmentData = {
                date: format(selectedDate, 'yyyy-MM-dd'),
                title: title.trim(),
                file_url: file_url
            };

            onUploadComplete(attachmentData);
            // Reset state after successful upload passed to parent
            setFile(null);
            setTitle('');

        } catch (err) {
            setError("Hiba történt a feltöltés során.");
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    if (file) {
        return (
            <div className="space-y-4">
                 {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                    <File className="w-6 h-6 text-muted-foreground" />
                    <div className="flex-1">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Melléklet címe"
                        />
                        <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Feltöltés és mentés"}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-10 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
            >
                <input 
                    ref={fileInputRef}
                    type="file" 
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf"
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="font-medium">Húzd ide a fájlt, vagy kattints</p>
                    <p className="text-sm text-muted-foreground">PDF vagy kép fájlok</p>
                </div>
            </div>
             <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
            />
            <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
            >
                <Camera className="w-4 h-4" />
                Fotó készítése kamerával
            </Button>
        </div>
    );
}
