
import React, { useState, useMemo } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Trash2, FileText, UploadCloud, AlertTriangle, Search, Tag, Box, Package as PackageIcon, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { getWeek } from 'date-fns';
import WeekDropdownSelector from '../components/shared/WeekDropdownSelector';
import FileUploadWithOCR from '../components/FileUploadWithOCR';
import ReturnItemCard from '../components/returns/ReturnItemCard';
import ReturnItemScanner from '../components/returns/ReturnItemScanner';
import _ from 'lodash';
import { motion } from "framer-motion";

const RETURN_TYPES = {
  plu: { label: "PLU", icon: Tag, color: "text-blue-500" },
  beraktarozott: { label: "Beraktározott", icon: Box, color: "text-purple-500" },
  parkside: { label: "Parkside", icon: PackageIcon, color: "text-orange-500" },
  egyeb: { label: "Egyéb", icon: PackageIcon, color: "text-gray-500" }
};

// Component to edit the custom name of a document
const DocumentNameEditor = ({ documentNumber, currentName, items, currentWeek, queryClient }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(currentName || '');

  const updateNameMutation = useMutation({
    mutationFn: async ({ documentNumber, newCustomName, weekNumber }) => {
      // Find all items belonging to this document number and week
      const itemsToUpdate = items.filter(item => item.document_number === documentNumber && item.week_number === weekNumber);
      
      const updatePromises = itemsToUpdate.map(item =>
        supabaseClient.entities.ReturnItem.update(item.id, { document_custom_name: newCustomName })
      );
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returnItems', currentWeek] });
      setIsOpen(false);
    },
    onError: (error) => {
      console.error("Failed to update document name:", error);
      // TODO: Add a toast notification here
    }
  });

  const handleSave = () => {
    if (newName.trim() === currentName) { // No change, just close
      setIsOpen(false);
      return;
    }
    updateNameMutation.mutate({ documentNumber, newCustomName: newName.trim(), weekNumber: currentWeek });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
          <Pencil className="w-3 h-3 mr-1" />
          {currentName ? "Név szerkesztése" : "Név hozzáadása"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentName ? "Bizonylat nevének szerkesztése" : "Bizonylat nevének hozzáadása"}</DialogTitle>
          <DialogDescription>
            Add meg a bizonylatnak egy könnyen megjegyezhető nevet. Ez felülírja a 'Bizonylat: {documentNumber}' alapértelmezett megnevezést.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Pl. 'Parkside akció 2023.10.12'"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="mt-4"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Mégse</Button>
          <Button onClick={handleSave} disabled={updateNameMutation.isPending || !newName.trim()}>
            {updateNameMutation.isPending ? "Mentés..." : "Mentés"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default function Returns() {
  const [currentWeek, setCurrentWeek] = useState(getWeek(new Date(), { weekStartsOn: 1, firstWeekContainsDate: 4 }));
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const queryClient = useQueryClient();

  const { data: returnItems, isLoading } = useQuery({
    queryKey: ['returnItems', currentWeek],
    queryFn: () => supabaseClient.entities.ReturnItem.filter({ week_number: currentWeek }),
    initialData: [],
  });

  const bulkCreateItemsMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.ReturnItem.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returnItems', currentWeek] });
    },
  });

  const handleCentralListExtracted = (results) => {
    const allItems = results.flatMap(r => r.output?.items || []);
    if (allItems.length === 0) return;

    const newItems = allItems
      .map((item, index) => {
        let returnType = 'egyeb';
        let categoryName = item.section_title || 'Egyéb';
        
        const sectionTitle = (item.section_title || '').toLowerCase();
        
        if (sectionTitle.includes('parkside')) {
          returnType = 'parkside';
          categoryName = 'Parkside';
        } else if (sectionTitle.includes('plu')) {
          returnType = 'plu';
          categoryName = 'PLU';
        } else if (sectionTitle.includes('beraktároz') || sectionTitle.includes('beraktaroz')) {
          returnType = 'beraktarozott';
          categoryName = 'Beraktározás';
        }

        return {
          week_number: currentWeek,
          return_type: returnType,
          document_number: item.bizonylat_szam || 'Ismeretlen',
          document_custom_name: categoryName,
          barcode: item.cikkszam,
          product_name: item.megnevezes,
          planned_quantity: item.tervkeszlet,
          quantity: null,
          manual: false,
          order: index + 1
        };
      });

    if (newItems.length > 0) {
      bulkCreateItemsMutation.mutate(newItems);
    }
    setIsUploadOpen(false);
  };
  
  const filteredItems = useMemo(() => {
    if (!searchTerm) return returnItems;
    return returnItems.filter(item => 
        (item.product_name && item.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.document_number && item.document_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.document_custom_name && item.document_custom_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [returnItems, searchTerm]);

  const groupedItems = useMemo(() => {
    const itemsToGroup = searchTerm ? filteredItems : returnItems;
    const grouped = _.groupBy(itemsToGroup, 'document_number');
    
    // Rendezzük minden csoporton belül az order szerint
    Object.keys(grouped).forEach(key => {
      grouped[key] = grouped[key].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    
    return grouped;
  }, [returnItems, searchTerm, filteredItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                NF visszaküldés
              </h1>
              <p className="text-muted-foreground">
                Tételek rögzítése és kezelése
              </p>
            </div>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg">
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Tervkészlet Feltöltése
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tervkészlet Lista Feltöltése</DialogTitle>
                <DialogDescription>
                  Töltsd fel a központi segédtáblázatot a tételek automatikus létrehozásához.
                </DialogDescription>
              </DialogHeader>
              <FileUploadWithOCR
                onExtracted={handleCentralListExtracted}
                jsonSchema={{
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      description: "A táblázatban szereplő összes terméksor a PONTOS SORRENDBEN, ahogy látszanak.",
                      items: {
                        type: "object",
                        properties: {
                          section_title: { 
                            type: "string", 
                            description: "A termék feletti szekció címe (pl. 'Parkside', 'PLU', 'Beraktározás'). Ez mindig VASTAG BETŰS CÍM. Ha nincs cím felette, akkor az utolsó vastag betűs címet írd be amit láttál." 
                          },
                          bizonylat_szam: {
                            type: "string",
                            description: "A bizonylatszám, ami a termék feletti section_title felett van. Ha nincs bizonylatszám, akkor 'Ismeretlen'."
                          },
                          cikkszam: { 
                            type: "string", 
                            description: "A termék cikkszáma (bal oldali oszlop)." 
                          },
                          megnevezes: { 
                            type: "string", 
                            description: "A termék neve (középső oszlop)." 
                          },
                          tervkeszlet: { 
                            type: "number", 
                            description: "A jobb oldali oszlopban lévő szám (Tervkészlet/Összeg oszlop). Ha üres vagy 0, írj 0-t." 
                          }
                        },
                        required: ["section_title", "bizonylat_szam", "cikkszam", "megnevezes", "tervkeszlet"]
                      }
                    }
                  },
                  required: ["items"]
                }}
                title="Központi segédtáblázat feltöltése"
              />
            </DialogContent>
          </Dialog>
        </motion.div>
        
        <WeekDropdownSelector currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
        
        <ReturnItemScanner returnItems={returnItems} weekNumber={currentWeek} returnTypes={RETURN_TYPES} />

        <div className="relative my-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés a rögzített tételek között..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2"
          />
        </div>

        <div className="space-y-6">
          {Object.keys(groupedItems).length > 0 ? (
            Object.keys(groupedItems).map(documentNumber => {
              const items = groupedItems[documentNumber] || [];
              const firstItem = items[0];
              const Icon = RETURN_TYPES[firstItem?.return_type]?.icon || PackageIcon;
              const customName = firstItem?.document_custom_name;
              
              if (items.length === 0) return null;

              return (
                <motion.div
                  key={documentNumber}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-lg border-2">
                    <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-card to-muted/20">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${
                          firstItem?.return_type === 'plu' ? 'from-blue-500 to-blue-600' : 
                          firstItem?.return_type === 'beraktarozott' ? 'from-purple-500 to-purple-600' : 
                          firstItem?.return_type === 'parkside' ? 'from-orange-500 to-orange-600' : 
                          'from-gray-500 to-gray-600'
                        } shadow-md`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold">
                            {customName || RETURN_TYPES[firstItem?.return_type]?.label || 'Egyéb'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">Bizonylat: {documentNumber}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {items.length} tétel
                          </p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="text-destructive"/>
                              Biztosan törlöd ezt a bizonylatot?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              A(z) {documentNumber} bizonylathoz tartozó {items.length} tétel véglegesen törlődik.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={async () => {
                                const deletePromises = items.map(item => supabaseClient.entities.ReturnItem.delete(item.id));
                                await Promise.all(deletePromises);
                                queryClient.invalidateQueries({ queryKey: ['returnItems', currentWeek] });
                              }}>
                              Igen, törlöm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {items.map(item => (
                        <ReturnItemCard key={item.id} item={item} />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          ) : (
            !isLoading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 px-6 border-2 border-dashed rounded-xl"
              >
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-muted-foreground">Nincsenek visszaküldési tételek</h3>
                <p className="text-sm text-muted-foreground/80 mt-1">Tölts fel egy tervkészletet a kezdéshez, vagy válassz másik hetet.</p>
              </motion.div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
