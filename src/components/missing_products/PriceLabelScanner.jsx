import React, { useState, useRef } from 'react';
import { supabaseClient } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Loader2, CheckCircle, AlertCircle, Package, Snowflake, Refrigerator, Croissant, Images, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = {
  troso: { label: "Troso (szárazáru)", icon: Package, color: "from-amber-500 to-orange-500" },
  mopro: { label: "Mopro (hűtött)", icon: Refrigerator, color: "from-blue-500 to-cyan-500" },
  tiko: { label: "Tiko (fagyasztott)", icon: Snowflake, color: "from-indigo-500 to-purple-500" },
  bakeoff: { label: "Bakeoff (pékáru)", icon: Croissant, color: "from-yellow-500 to-amber-500" }
};

export default function PriceLabelScanner({ onProductScanned, selectedDate }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualProduct, setManualProduct] = useState({
    article_number: '',
    product_name: '',
    description: '',
    category: 'troso'
  });
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const processPhoto = async (file) => {
    const { file_url } = await supabaseClient.integrations.Core.UploadFile({ file });
    
    const result = await supabaseClient.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          article_number: {
            type: "string",
            description: "A cikkszám, ami az ártábla BAL ALSÓ sarkában található. Általában 6-8 számjegyű. Példák: '6414030', '3576', '123456'. FONTOS: Csak a számokat add vissza, kötőjelek és egyéb karakterek nélkül!"
          },
          product_name: {
            type: "string",
            description: "A termék neve, ami az ártáblán a legnagyobb betűmérettel van írva (pl. 'Combino Spagetti', 'Trasi Olivaolaj')"
          },
          description: {
            type: "string",
            description: "A termék kiegészítő leírása, ami a név alatt található kisebb betűkkel (pl. 'teljes kiörlésű 500 g', 'extra szűz', stb.)"
          },
          category: {
            type: "string",
            enum: ["troso", "mopro", "tiko", "bakeoff"],
            description: "A termék kategóriája az alapján, hogy hol kell tárolni: 'troso' = szárazáru (szobahőmérsékleten), 'mopro' = hűtött (hűtőben, 2-8°C), 'tiko' = fagyasztott (-18°C), 'bakeoff' = pékáru (friss sütemény, kenyér). Példák: tej→mopro, fagyasztott pizza→tiko, tészta→troso, croissant→bakeoff"
          }
        },
        required: ["article_number", "product_name", "category"]
      }
    });

    if (result.status === 'success' && result.output?.article_number && result.output?.product_name) {
      return {
        ...result.output,
        image_url: file_url,
        category: result.output.category || 'troso'
      };
    }
    return null;
  };

  const handlePhotoScan = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);
    
    try {
      const productData = await processPhoto(file);
      
      if (productData) {
        onProductScanned(productData);
        setLastScanned(productData);
        setTimeout(() => setLastScanned(null), 3000);
      } else {
        setError("Nem sikerült beolvasni az ártáblát. Próbáld újra, élesebb képpel!");
      }
    } catch (e) {
      console.error("Scan error:", e);
      setError("Hiba történt a beolvasás során. Próbáld újra!");
    } finally {
      setIsScanning(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsScanning(true);
    setError(null);
    setProcessingProgress({ current: 0, total: files.length });
    
    try {
      let successCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        setProcessingProgress({ current: i + 1, total: files.length });
        
        try {
          const productData = await processPhoto(files[i]);
          if (productData) {
            onProductScanned(productData);
            successCount++;
          }
        } catch (e) {
          console.error(`Error processing file ${i}:`, e);
        }
      }
      
      if (successCount > 0) {
        setLastScanned({ count: successCount });
        setTimeout(() => setLastScanned(null), 3000);
      } else {
        setError("Nem sikerült egyetlen ártáblát sem beolvasni. Próbáld élesebb képekkel!");
      }
    } catch (e) {
      console.error("Gallery upload error:", e);
      setError("Hiba történt a feltöltés során. Próbáld újra!");
    } finally {
      setIsScanning(false);
      setProcessingProgress({ current: 0, total: 0 });
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  };

  const handleManualAdd = () => {
    if (manualProduct.article_number && manualProduct.product_name) {
      onProductScanned(manualProduct);
      setIsManualDialogOpen(false);
      setManualProduct({
        article_number: '',
        product_name: '',
        description: '',
        category: 'troso'
      });
      
      setLastScanned(manualProduct);
      setTimeout(() => setLastScanned(null), 3000);
    }
  };

  return (
    <Card className="mb-6 border-2">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Ártábla fotózása</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Fotózd le a hiánycikk ártábláját
            </p>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoScan}
            className="hidden"
            disabled={isScanning}
          />

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryUpload}
            className="hidden"
            disabled={isScanning}
          />

          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isScanning}
              size="lg"
              className="h-16 flex flex-col gap-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            >
              {isScanning && processingProgress.total === 0 ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Feldolgozás...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="text-xs">Fotó</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => galleryInputRef.current?.click()}
              disabled={isScanning}
              size="lg"
              variant="outline"
              className="h-16 flex flex-col gap-1 border-2"
            >
              {isScanning && processingProgress.total > 0 ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">{processingProgress.current}/{processingProgress.total}</span>
                </>
              ) : (
                <>
                  <Images className="w-5 h-5" />
                  <span className="text-xs">Galéria</span>
                </>
              )}
            </Button>

            <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 flex flex-col gap-1 border-2"
                  disabled={isScanning}
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-xs">Manuális</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Termék manuális hozzáadása</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="article">Cikkszám *</Label>
                    <Input
                      id="article"
                      placeholder="pl. 6414030"
                      value={manualProduct.article_number}
                      onChange={(e) => setManualProduct({...manualProduct, article_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Terméknév *</Label>
                    <Input
                      id="name"
                      placeholder="pl. Combino Spagetti"
                      value={manualProduct.product_name}
                      onChange={(e) => setManualProduct({...manualProduct, product_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Leírás</Label>
                    <Input
                      id="desc"
                      placeholder="pl. teljes kiörlésű 500 g"
                      value={manualProduct.description}
                      onChange={(e) => setManualProduct({...manualProduct, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategória *</Label>
                    <Select
                      value={manualProduct.category}
                      onValueChange={(value) => setManualProduct({...manualProduct, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORIES).map(([key, cat]) => {
                          const Icon = cat.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {cat.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsManualDialogOpen(false)}
                  >
                    Mégse
                  </Button>
                  <Button
                    onClick={handleManualAdd}
                    disabled={!manualProduct.article_number || !manualProduct.product_name}
                  >
                    Hozzáadás
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          )}

          <AnimatePresence>
            {lastScanned && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-green-900 dark:text-green-100">
                      {lastScanned.count ? `${lastScanned.count} termék` : 'Termék'} sikeresen hozzáadva!
                    </p>
                    {lastScanned.category && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        {React.createElement(CATEGORIES[lastScanned.category].icon, { className: "w-3 h-3" })}
                        {CATEGORIES[lastScanned.category].label}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}