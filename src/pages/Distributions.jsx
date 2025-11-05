
import React, { useState, useMemo } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "@/components/ui/dialog";
import { Package, Trash2, AlertTriangle, Search, UploadCloud } from "lucide-react";
import FileUploadWithOCR from "../components/FileUploadWithOCR";
import DistributionItem from "../components/distributions/DistributionItem";
import { format, addDays, subDays } from "date-fns"; // Added addDays and subDays
import { hu } from "date-fns/locale";
import _ from 'lodash';
import HorizontalDatepicker from '../components/daily_info/HorizontalDatepicker';
import { motion } from "framer-motion";

const safeParseDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return (date instanceof Date && !isNaN(date.getTime())) ? date : null;
};

export default function Distributions() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(0); // Added swipeDirection state
  const queryClient = useQueryClient();

  const { data: distributions } = useQuery({
    queryKey: ['distributions'],
    queryFn: () => supabaseClient.entities.Distribution.list('-date'),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabaseClient.entities.Distribution.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.Distribution.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ area, deliveryNoteNumber, date }) => {
        const itemsToDelete = distributions.filter(
          dist => dist.area === area && 
                  dist.delivery_note_number === deliveryNoteNumber && 
                  dist.date === date
        );
        const deletePromises = itemsToDelete.map(dist => supabaseClient.entities.Distribution.delete(dist.id));
        return Promise.all(deletePromises);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['distributions'] });
    },
  });

  const handleExtracted = (results) => {
    const allDistributionItems = results.flatMap(result => {
      if (!result.output || !result.output.products) return [];

      const area = result.output.area;
      const deliveryNoteNumber = result.output.delivery_note_number || 'N/A';
      const mainCategory = result.output.main_category || area;
      const items = result.output.products;
      const imageUrl = result.imageUrl;

      return items.map((item, index) => ({
        date: format(new Date(), 'yyyy-MM-dd'),
        delivery_note_number: deliveryNoteNumber,
        main_category: mainCategory,
        product_name: item.product_name || 'Ismeretlen termék',
        article_number: item.article_number || 'N/A',
        quantity: item.quantity || 0,
        unit: item.unit || 'karton',
        received_quantity: null,
        status: 'pending',
        note: '',
        area: area,
        image_url: imageUrl,
        order: item.order || (index + 1)
      }));
    });

    if (allDistributionItems.length > 0) {
      createMutation.mutate(allDistributionItems);
    }
    setIsUploadOpen(false);
  };

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');

  const itemsForSelectedDay = distributions.filter(dist => {
    const itemDate = safeParseDate(dist.date);
    return itemDate ? format(itemDate, 'yyyy-MM-dd') === selectedDateKey : false;
  });

  const searchResults = searchTerm
    ? itemsForSelectedDay.filter(item => 
        item.article_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const groupedByMainCategory = useMemo(() => {
    const itemsToGroup = searchTerm ? searchResults : itemsForSelectedDay;
    return _.groupBy(itemsToGroup, 'main_category');
  }, [itemsForSelectedDay, searchTerm, searchResults]);

  const hasItems = itemsForSelectedDay.length > 0;
  const hasSearchResults = searchResults.length > 0;

  // handleSwipe function
  const handleSwipe = (direction) => {
    if (direction === 'left') {
      setSwipeDirection(-1);
      setTimeout(() => {
        setSelectedDate(addDays(selectedDate, 1));
        setSwipeDirection(0);
      }, 200);
    } else if (direction === 'right') {
      setSwipeDirection(1);
      setTimeout(() => {
        setSelectedDate(subDays(selectedDate, 1));
        setSwipeDirection(0);
      }, 200);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Elosztások</h1>
              <p className="text-muted-foreground">Dokumentumok és termékek nyomon követése</p>
            </div>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg">
                <UploadCloud className="w-4 h-4 mr-2" />
                Dokumentum feltöltése
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Elosztási dokumentum feltöltése</DialogTitle>
              </DialogHeader>
              <FileUploadWithOCR
                onExtracted={handleExtracted}
                jsonSchema={{
                  type: "object",
                  properties: {
                    delivery_note_number: {
                      type: "string",
                      description: "A szállítólevél száma, ami a dokumentum tetején található."
                    },
                    main_category: {
                      type: "string",
                      description: "FONTOS SZABÁLY: Nézd meg a szállítólevél szám ALATTI sort..."
                    },
                    area: {
                      type: "string",
                      description: "A dokumentum bal oldalán, a 'Terület' szó mellett található azonosító."
                    },
                    products: {
                      type: "array",
                      description: "A dokumentumban található összes termék listája, PONTOS SORRENDBEN.",
                      items: {
                        type: "object",
                        properties: {
                          order: { type: "number", description: "A termék sorszáma a dokumentumon." },
                          article_number: { type: "string", description: "A termék cikkszáma a 'Cikk' oszlopból." },
                          product_name: { type: "string", description: "A termék neve." },
                          quantity: { type: "number", description: "FONTOS: Mindig a 'Kiszállítva mennyiség' oszlopban lévő értéket használd!" },
                          unit: {
                            type: "string",
                            enum: ["karton", "db"],
                            description: "A mennyiség egysége."
                          }
                        },
                        required: ["order", "article_number", "product_name", "quantity", "unit"]
                      }
                    }
                  },
                  required: ["delivery_note_number", "main_category", "area", "products"]
                }}
                title="Elosztási dokumentum feltöltése"
              />
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="space-y-6">
          <HorizontalDatepicker 
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate}
              allDailyInfos={distributions.map(d => ({
                date: d.date, 
                completed: d.status !== 'pending' && d.status !== 'discrepancy'
              }))}
          />

          <div className="relative mt-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cikkszám keresése a kiválasztott napon..."
              className="pl-10 h-11 border-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <motion.div
            key={selectedDateKey}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            dragMomentum={false}
            onDragEnd={(event, info) => {
              const swipeThreshold = 80;
              const velocity = Math.abs(info.velocity.x);
              
              if (info.offset.x > swipeThreshold || (info.offset.x > 30 && velocity > 500)) {
                handleSwipe('right'); // Swiped right, go to previous day
              } else if (info.offset.x < -swipeThreshold || (info.offset.x < -30 && velocity > 500)) {
                handleSwipe('left'); // Swiped left, go to next day
              }
            }}
            initial={{ opacity: 0, x: swipeDirection === -1 ? 50 : swipeDirection === 1 ? -50 : 0 }}
            animate={{ 
              opacity: 1,
              x: 0,
            }}
            exit={{ 
              opacity: 0,
              x: swipeDirection === -1 ? -50 : swipeDirection === 1 ? 50 : 0,
            }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }}
          >
            {searchTerm ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Keresési eredmények ({searchResults.length})
                </h2>
                {hasSearchResults ? (
                  <div className="space-y-3">
                    {searchResults.map((dist) => (
                      <DistributionItem key={dist.id} distribution={dist} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-6 border-2 border-dashed rounded-xl">
                    <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Nincs találat</h3>
                    <p className="text-sm text-muted-foreground/80 mt-1">Nincs ilyen cikkszámú termék a kiválasztott napon.</p>
                  </div>
                )}
              </motion.div>
            ) : hasItems ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {Object.entries(groupedByMainCategory).map(([mainCategory, categoryItems]) => {
                  const subGroups = _.groupBy(categoryItems, item => `${item.area}|||${item.delivery_note_number}`);
                  
                  return (
                    <div key={mainCategory} className="space-y-4">
                      <h2 className="text-2xl font-bold text-foreground sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
                        {mainCategory}
                      </h2>
                      
                      <Accordion type="multiple" className="space-y-4">
                        {Object.entries(subGroups).map(([groupKey, items]) => {
                          const [area, deliveryNoteNumber] = groupKey.split('|||');
                          
                          const sortedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
                          
                          const processedCount = sortedItems.filter(i => i.status !== 'pending').length;
                          const totalCount = sortedItems.length;
                          const hasDiscrepancy = sortedItems.some(item => item.status === 'discrepancy');

                          return (
                            <AccordionItem key={groupKey} value={groupKey} className="border-none">
                              <Card className="shadow-lg border-2 hover:border-primary/50 transition-colors">
                                <AccordionTrigger className="p-4 hover:no-underline rounded-lg">
                                  <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-2 pr-4 w-full">
                                    <div className="flex flex-col gap-1 text-left">
                                      <span className="text-lg font-bold text-foreground">Szállítólevél: {deliveryNoteNumber}</span>
                                      <span className="text-xs text-muted-foreground">{area}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {hasDiscrepancy && <AlertTriangle className="w-5 h-5 text-red-500" />}
                                      <span className={`font-semibold ${processedCount === totalCount && totalCount > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                        {processedCount}/{totalCount}
                                      </span>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive -mr-2" onClick={(e) => e.stopPropagation()}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Biztosan törlöd ezt az elosztást?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Ezzel a(z) "{area}" területhez és "{deliveryNoteNumber}" szállítólevélhez tartozó összes termék törlődni fog erről a napról.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate({ area, deliveryNoteNumber, date: selectedDateKey })}>
                                              Törlés
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                  <div className="space-y-3 border-t pt-4">
                                    {sortedItems.map((dist) => (
                                      <DistributionItem key={dist.id} distribution={dist} />
                                    ))}
                                  </div>
                                </AccordionContent>
                              </Card>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 px-6 border-2 border-dashed rounded-xl"
              >
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-muted-foreground">Nincsenek elosztások a kiválasztott napon</h3>
                <p className="text-sm text-muted-foreground/80 mt-1">Válassz másik napot, vagy tölts fel egy dokumentumot.</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
