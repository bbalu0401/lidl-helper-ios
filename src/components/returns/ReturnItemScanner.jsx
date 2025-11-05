
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/api/supabaseClient';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Barcode, CheckCircle, AlertCircle, Camera, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ReturnItemScanner({ returnItems, weekNumber, returnTypes }) {
    const [barcode, setBarcode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [foundItem, setFoundItem] = useState(null);
    const [error, setError] = useState(null);
    const [lastAdded, setLastAdded] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const barcodeInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const quantityInputRef = useRef(null); // Added: Ref for quantity input
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => supabaseClient.entities.ReturnItem.update(id, data),
        onSuccess: (updatedItem) => {
            queryClient.invalidateQueries({ queryKey: ['returnItems', weekNumber] });
            
            const quantityAdded = parseInt(quantity, 10);
            if (!isNaN(quantityAdded)) {
                const displayItem = {
                    ...updatedItem,
                    id: updatedItem.id || foundItem.id,
                    product_name: foundItem.product_name,
                    quantity_added: quantityAdded,
                    return_type: foundItem.return_type,
                };
                setLastAdded(displayItem);
                setTimeout(() => setLastAdded(null), 2000);
            }

            // A mezők garantált kiürítése
            setBarcode('');
            setQuantity('');
            setFoundItem(null);
            setError(null);
            // Késleltetett fókusz a megbízható működésért, különösen mobilon
            setTimeout(() => {
                barcodeInputRef.current?.focus();
            }, 0);
        },
        onError: (err) => {
            console.error("Mutation error:", err);
            setError("Hiba történt a mentés során.");
        }
    });

    const handlePhotoScan = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setError(null);
        try {
            const { file_url } = await supabaseClient.integrations.Core.UploadFile({ file });
            const result = await supabaseClient.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        barcode: {
                            type: "string",
                            description: "A képen található vonalkód alatti számsor, vagy az 'IAN' jelölés melletti számsor. Csak a számokat add vissza, kötőjelek és egyéb karakterek nélkül."
                        }
                    },
                    required: ["barcode"]
                }
            });

            if (result.status === 'success' && result.output?.barcode) {
                setBarcode(result.output.barcode);
                quantityInputRef.current?.focus(); // Added: Focus on quantity after successful scan
            } else {
                setError("Nem sikerült a vonalkódot beolvasni.");
            }
        } catch (e) {
            console.error("Scan error:", e);
            setError("Kamera hiba történt.");
        } finally {
            setIsScanning(false);
            // Reset file input to allow re-scanning the same image
            if (cameraInputRef.current) {
                cameraInputRef.current.value = "";
            }
        }
    };

    useEffect(() => {
        // Clear lastAdded message if barcode changes
        if (lastAdded && barcode) {
            setLastAdded(null);
        }

        if (barcode) {
            const item = returnItems.find(i => i.barcode === barcode);
            setFoundItem(item || null);
            if (!item) {
                setError("Nem található ilyen cikkszámú termék a listán.");
            } else {
                setError(null);
            }
        } else {
            setFoundItem(null);
            setError(null);
        }
    }, [barcode, returnItems, lastAdded]);

    const handleAdd = (e) => {
        e.preventDefault();
        const quantityToAdd = parseInt(quantity, 10);

        if (!foundItem || !quantityToAdd || quantityToAdd <= 0) {
             setError("Érvénytelen mennyiség vagy hiányzó termék.");
             return
        };

        const newTotalQuantity = (foundItem.quantity || 0) + quantityToAdd;
        updateMutation.mutate({ id: foundItem.id, data: { quantity: newTotalQuantity } });
    };

    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="barcode-scanner" className="text-sm font-medium text-muted-foreground">
                           Cikkszám
                        </label>
                        <div className="relative">
                           <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                           <Input
                                ref={barcodeInputRef}
                                id="barcode-scanner"
                                placeholder="Cikkszám beolvasása vagy beírása..."
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                className="pl-10 pr-12 h-12 text-lg"
                                autoFocus
                                disabled={isScanning}
                            />
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoScan}
                                className="hidden"
                                disabled={isScanning}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9"
                                onClick={() => cameraInputRef.current?.click()}
                                disabled={isScanning}
                            >
                                {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                            </Button>
                        </div>
                         {error && <p className="text-sm text-destructive font-medium flex items-center gap-1.5 pt-1"><AlertCircle size={14}/>{error}</p>}
                         {foundItem && !error && (
                            <div className="text-sm text-green-600 font-semibold pt-2 flex items-center gap-2 flex-wrap">
                                <CheckCircle size={16}/> 
                                <span>{foundItem.product_name}</span>
                                <Badge variant="secondary">{returnTypes[foundItem.return_type]?.label || foundItem.return_type}</Badge>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-end gap-3">
                         <div className="flex-1 space-y-1">
                             <label htmlFor="quantity-input" className="text-sm font-medium text-muted-foreground">
                                Mennyiség
                            </label>
                            <Input
                                ref={quantityInputRef} // Added: Ref for quantity input
                                id="quantity-input"
                                type="number"
                                placeholder="db"
                                value={quantity}
                                onChange={(e) => {
                                    setQuantity(e.target.value);
                                    // Clear lastAdded message if quantity input changes
                                    if (lastAdded) {
                                        setLastAdded(null);
                                    }
                                }}
                                className="h-12 text-lg"
                                min="1"
                                disabled={isScanning}
                            />
                        </div>
                        <Button type="submit" size="lg" className="h-12 gap-2" disabled={!foundItem || !quantity || updateMutation.isLoading || isScanning}>
                            <Plus className="w-5 h-5" /> Hozzáadás
                        </Button>
                    </div>
                </form>
                <AnimatePresence>
                {lastAdded && (
                     <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center"
                     >
                        <div className="flex flex-col items-center gap-1">
                            <p className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                                + {lastAdded.quantity_added} db <span className="font-normal text-green-600 dark:text-green-400">({lastAdded.product_name})</span>
                                <Badge variant="secondary" className="text-xs">{returnTypes[lastAdded.return_type]?.label}</Badge>
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400">Új összesen: {lastAdded.quantity} db</p>
                        </div>
                     </motion.div>
                )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
