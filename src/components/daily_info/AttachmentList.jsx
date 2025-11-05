import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Paperclip, File, CheckCircle2, UploadCloud, ImageIcon, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import FileUploadWithOCR from '../FileUploadWithOCR';
import { motion, AnimatePresence } from 'framer-motion';

function AttachmentItem({ attachment, onTaskListExtracted, onAttachmentUploaded, onDelete }) {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const lastTouchDistance = useRef(null);
    const lastTouchCenter = useRef(null);
    const isPinching = useRef(false);

    const hasImages = attachment.file_urls && attachment.file_urls.length > 0;
    
    const handleExtracted = (results) => {
        if (results.length > 0) {
            const imageUrls = results.map(r => r.imageUrl).filter(Boolean);
            
            if (attachment.is_task_list) {
                onTaskListExtracted(results, attachment.id);
            } else {
                onAttachmentUploaded(attachment.id, imageUrls);
            }
        }
        setIsUploadOpen(false);
    };

    const handleNextImage = () => {
        if (hasImages && currentImageIndex < attachment.file_urls.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    const handlePrevImage = () => {
        if (hasImages && currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    const getTouchDistance = (touch1, touch2) => {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touch1, touch2) => {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let startTouchDistance = null;
        let startScale = 1;
        let startX = 0;
        let startY = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let isSwiping = false;

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                // Pinch gesture started
                isPinching.current = true;
                isSwiping = false;
                e.preventDefault();
                
                startTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
                startScale = scale;
                lastTouchCenter.current = getTouchCenter(e.touches[0], e.touches[1]);
            } else if (e.touches.length === 1 && scale === 1) {
                // Single touch - potentially a swipe
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                startX = position.x;
                startY = position.y;
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2 && isPinching.current) {
                // Pinch zooming
                e.preventDefault();
                
                const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
                const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);
                
                if (startTouchDistance && lastTouchCenter.current) {
                    const scaleChange = currentDistance / startTouchDistance;
                    const newScale = Math.max(0.5, Math.min(4, startScale * scaleChange));
                    
                    // Calculate position adjustment to zoom towards touch center
                    const dx = currentCenter.x - lastTouchCenter.current.x;
                    const dy = currentCenter.y - lastTouchCenter.current.y;
                    
                    setScale(newScale);
                    setPosition(prev => ({
                        x: prev.x + dx,
                        y: prev.y + dy
                    }));
                    
                    lastTouchCenter.current = currentCenter;
                }
            } else if (e.touches.length === 1 && scale > 1) {
                // Panning when zoomed
                e.preventDefault();
                const dx = e.touches[0].clientX - touchStartX;
                const dy = e.touches[0].clientY - touchStartY;
                
                setPosition({
                    x: startX + dx,
                    y: startY + dy
                });
            } else if (e.touches.length === 1 && scale === 1) {
                // Check if it's a swipe
                const dx = e.touches[0].clientX - touchStartX;
                const dy = e.touches[0].clientY - touchStartY;
                
                if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) {
                    isSwiping = true;
                }
            }
        };

        const handleTouchEnd = (e) => {
            if (isPinching.current && e.touches.length < 2) {
                isPinching.current = false;
                startTouchDistance = null;
                lastTouchCenter.current = null;
            }
            
            // Handle swipe for page change
            if (isSwiping && scale === 1 && e.changedTouches.length > 0) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                
                if (dx > 100) {
                    handlePrevImage();
                } else if (dx < -100) {
                    handleNextImage();
                }
            }
            
            isSwiping = false;
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [scale, position, currentImageIndex, attachment.file_urls]);

    const content = () => {
        if (attachment.status === 'uploaded') {
            const sharedClasses = "flex items-center gap-3 p-3 -mx-3 rounded-lg transition-colors hover:bg-accent w-full text-left";
            if (hasImages) {
                return (
                    <div className="flex items-center gap-2">
                        <div className='flex-1'>
                             <Dialog
                                open={isGalleryOpen}
                                onOpenChange={(isOpen) => {
                                    setIsGalleryOpen(isOpen);
                                    if (isOpen) {
                                        setCurrentImageIndex(0);
                                        setScale(1);
                                        setPosition({ x: 0, y: 0 });
                                    }
                                }}
                             >
                                <DialogTrigger asChild>
                                     <button className={sharedClasses}>
                                        <ImageIcon className="w-5 h-5 text-primary" />
                                        <span className="flex-1 font-medium text-foreground truncate">{attachment.title}</span>
                                        {attachment.file_urls.length > 1 && (
                                            <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-md">{attachment.file_urls.length} oldal</span>
                                        )}
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-full w-full h-[100dvh] p-0 bg-black/95 border-none">
                                    {hasImages && (
                                        <div 
                                            ref={containerRef}
                                            className="relative w-full h-full flex items-center justify-center overflow-hidden"
                                            onClick={(e) => {
                                                // Close only if clicking on background (not on image)
                                                if (e.target === e.currentTarget && scale === 1) {
                                                    setIsGalleryOpen(false);
                                                }
                                            }}
                                        >
                                            {/* Close button */}
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                onClick={() => setIsGalleryOpen(false)}
                                                className="absolute top-4 right-4 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 border-none"
                                            >
                                                <X className="w-6 h-6 text-white" />
                                            </Button>

                                            {/* Image container */}
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <AnimatePresence mode="wait">
                                                    <motion.img
                                                        key={currentImageIndex}
                                                        ref={imageRef}
                                                        src={attachment.file_urls[currentImageIndex]}
                                                        alt={`${attachment.title} - ${currentImageIndex + 1}`}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="max-w-full max-h-full object-contain select-none"
                                                        style={{
                                                            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                                                            transition: isPinching.current ? 'none' : 'transform 0.1s ease-out',
                                                        }}
                                                        draggable={false}
                                                    />
                                                </AnimatePresence>
                                            </div>

                                            {/* Navigation buttons */}
                                            {attachment.file_urls.length > 1 && scale === 1 && (
                                                <>
                                                    {currentImageIndex > 0 && (
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            onClick={handlePrevImage}
                                                            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 border-none"
                                                        >
                                                            <ChevronLeft className="w-6 h-6 text-white" />
                                                        </Button>
                                                    )}

                                                    {currentImageIndex < attachment.file_urls.length - 1 && (
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            onClick={handleNextImage}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 border-none"
                                                        >
                                                            <ChevronRight className="w-6 h-6 text-white" />
                                                        </Button>
                                                    )}

                                                    {/* Page indicator */}
                                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                                                        <span className="text-white font-medium text-sm">
                                                            {currentImageIndex + 1} / {attachment.file_urls.length}
                                                        </span>
                                                    </div>

                                                    {/* Page dots */}
                                                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                                                        {attachment.file_urls.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    setCurrentImageIndex(idx);
                                                                    setScale(1);
                                                                    setPosition({ x: 0, y: 0 });
                                                                }}
                                                                className={`w-2 h-2 rounded-full transition-all ${
                                                                    idx === currentImageIndex 
                                                                        ? 'bg-white w-6' 
                                                                        : 'bg-white/40 hover:bg-white/60'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        A "{attachment.title}" dokumentum törlődni fog. {attachment.is_task_list && "A hozzá tartozó feladatok is törlődnek."} A művelet nem vonható vissza.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(attachment.id)}>Törlés</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                );
            }
            
            return (
                 <div className="flex items-center gap-2">
                    <div className={`${sharedClasses} flex-1`}>
                        <File className="w-5 h-5 text-primary" />
                        <span className="flex-1 font-medium text-foreground truncate">{attachment.title}</span>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    A "{attachment.title}" dokumentum törlődni fog. A művelet nem vonható vissza.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Mégse</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(attachment.id)}>Törlés</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg bg-muted/20">
                <File className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 font-medium text-muted-foreground truncate">{attachment.title}</span>
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="secondary">
                            <UploadCloud className="w-4 h-4 mr-2" />
                            Feltöltés
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Fájl feltöltése: {attachment.title}</DialogTitle>
                        </DialogHeader>
                        <FileUploadWithOCR
                             onExtracted={handleExtracted}
                            jsonSchema={attachment.is_task_list ? {
                                type: "object",
                                properties: {
                                    informaciok: {
                                        type: "array", 
                                        description: "A képen látható összes napi információs blokk. Minden blokk egy 'Téma', opcionálisan 'Érintett' kör, és a 'Tartalom' részből áll. A 'tartalmaz_kepet' mező jelezze, ha a blokkhoz vizuális tartalom (kép) is tartozik.",
                                        items: {
                                            type: "object",
                                            properties: { 
                                                tema: { type: "string", description: "Az információs blokk címe vagy témája." }, 
                                                erintett: { type: "string", description: "Az érintettek köre (pl. 'Kassza', 'Mindenki'). Ha nincs expliciten megadva, hagyd üresen." }, 
                                                tartalom: { type: "string", description: "Az információs blokk teljes szöveges tartalma." }, 
                                                tartalmaz_kepet: { type: "boolean", description: "Igaz, ha az információs blokkhoz egy vagy több kép is tartozik a dokumentumon." } 
                                            },
                                            required: ["tema", "tartalom", "tartalmaz_kepet"]
                                        }
                                    }
                                },
                                required: ["informaciok"]
                            } : { 
                                type: "object", 
                                properties: { 
                                    content: { type: "string", description: "A dokumentum teljes szöveges tartalma."} 
                                }, 
                                required: ["content"] 
                            }}
                            title="Húzd ide a megfelelő fájlt"
                        />
                    </DialogContent>
                </Dialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 -mr-2">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                            <AlertDialogDescription>
                                A(z) "{attachment.title}" helyőrző véglegesen törlődni fog. Ezt a műveletet nem lehet visszavonni.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(attachment.id)}>Törlés</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }
    
    return content();
}


export default function AttachmentList({ attachments, onTaskListExtracted, onAttachmentUploaded, onDeleteAttachment }) {
    if (!attachments || attachments.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                    Mai Dokumentumok
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {attachments.map(attachment => (
                        <AttachmentItem 
                          key={attachment.id}
                          attachment={attachment}
                          onTaskListExtracted={onTaskListExtracted}
                          onAttachmentUploaded={onAttachmentUploaded}
                          onDelete={onDeleteAttachment}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}