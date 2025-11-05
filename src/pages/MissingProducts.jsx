
import React, { useState, useMemo } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackageX, Search, Filter, Package, Snowflake, Refrigerator, Croissant, Trash2 } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { hu } from "date-fns/locale";
import { motion } from "framer-motion";
import _ from 'lodash';
import PriceLabelScanner from "../components/missing_products/PriceLabelScanner";
import MissingProductCard from "../components/missing_products/MissingProductCard";
import HorizontalDatepicker from '../components/daily_info/HorizontalDatepicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const CATEGORIES = {
  troso: { label: "Troso (szárazáru)", icon: Package, color: "from-amber-500 to-orange-500" },
  mopro: { label: "Mopro (hűtött)", icon: Refrigerator, color: "from-blue-500 to-cyan-500" },
  tiko: { label: "Tiko (fagyasztott)", icon: Snowflake, color: "from-indigo-500 to-purple-500" },
  bakeoff: { label: "Bakeoff (pékáru)", icon: Croissant, color: "from-yellow-500 to-amber-500" }
};

const safeParseDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return (date instanceof Date && !isNaN(date.getTime())) ? date : null;
};

export default function MissingProducts() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [swipeDirection, setSwipeDirection] = useState(0);
  
  const queryClient = useQueryClient();
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');

  const { data: allMissingProducts } = useQuery({
    queryKey: ['missingProducts'],
    queryFn: () => supabaseClient.entities.MissingProduct.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.MissingProduct.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missingProducts'] });
    },
  });

  const deleteDayMutation = useMutation({
    mutationFn: async (date) => {
      const itemsToDelete = allMissingProducts.filter(p => p.date === date);
      const deletePromises = itemsToDelete.map(p => supabaseClient.entities.MissingProduct.delete(p.id));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missingProducts'] });
    },
  });

  const handleProductScanned = (productData) => {
    createMutation.mutate({
      date: selectedDateKey,
      article_number: productData.article_number,
      product_name: productData.product_name,
      description: productData.description || null,
      image_url: productData.image_url,
      category: productData.category,
      status: 'open'
    });
  };

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

  const productsForSelectedDate = useMemo(() => {
    return allMissingProducts.filter(p => p.date === selectedDateKey);
  }, [allMissingProducts, selectedDateKey]);

  const filteredProducts = useMemo(() => {
    let filtered = productsForSelectedDate;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.article_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    return filtered;
  }, [productsForSelectedDate, searchTerm, statusFilter, categoryFilter]);

  const statusCounts = useMemo(() => {
    return productsForSelectedDate.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
  }, [productsForSelectedDate]);

  const categoryCounts = useMemo(() => {
    return productsForSelectedDate.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
  }, [productsForSelectedDate]);

  const groupedByCategory = useMemo(() => {
    return _.groupBy(filteredProducts, 'category');
  }, [filteredProducts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
            <PackageX className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Hiánycikk
            </h1>
            <p className="text-muted-foreground">
              Hiánycikkek nyomon követése
            </p>
          </div>
          {productsForSelectedDate.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Összes hiánycikk törlése ezen a napon?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {format(selectedDate, 'yyyy. MMMM d.', { locale: hu })} - {productsForSelectedDate.length} termék törlődni fog.
                    <br />
                    Ez a művelet nem vonható vissza.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteDayMutation.mutate(selectedDateKey)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Összes törlése
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </motion.div>

        <HorizontalDatepicker 
          selectedDate={selectedDate} 
          setSelectedDate={setSelectedDate}
          allDailyInfos={allMissingProducts.map(p => ({ date: p.date, completed: p.status === 'resolved' }))}
        />

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
              handleSwipe('right');
            } else if (info.offset.x < -swipeThreshold || (info.offset.x < -30 && velocity > 500)) {
              handleSwipe('left');
            }
          }}
          initial={{ opacity: 0, x: swipeDirection === -1 ? 50 : swipeDirection === 1 ? -50 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: swipeDirection === -1 ? -50 : swipeDirection === 1 ? 50 : 0 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            opacity: { duration: 0.2 }
          }}
          className="space-y-6"
        >
          <PriceLabelScanner 
            onProductScanned={handleProductScanned}
            selectedDate={selectedDate}
          />

          {productsForSelectedDate.length > 0 && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Keresés név vagy cikkszám alapján..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] border-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Kategória" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes ({productsForSelectedDate.length})</SelectItem>
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>
                        {cat.label.split('(')[0].trim()} ({categoryCounts[key] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] border-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Státusz" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes státusz</SelectItem>
                    <SelectItem value="open">Nyitott ({statusCounts.open || 0})</SelectItem>
                    <SelectItem value="in_stock">Raktáron ({statusCounts.in_stock || 0})</SelectItem>
                    <SelectItem value="wrong_inventory">Rossz készlet ({statusCounts.wrong_inventory || 0})</SelectItem>
                    <SelectItem value="arriving_soon">Beérkezés várható ({statusCounts.arriving_soon || 0})</SelectItem>
                    <SelectItem value="resolved">Megoldva ({statusCounts.resolved || 0})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {categoryFilter === 'all' && !searchTerm ? (
                <div className="space-y-6">
                  {Object.entries(CATEGORIES).map(([catKey, catConfig]) => {
                    const products = groupedByCategory[catKey] || [];
                    if (products.length === 0) return null;

                    const CatIcon = catConfig.icon;
                    return (
                      <div key={catKey}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${catConfig.color}`}>
                            <CatIcon className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-lg font-bold text-foreground">
                            {catConfig.label}
                          </h2>
                          <span className="ml-auto text-sm font-semibold px-3 py-1 rounded-full bg-muted text-foreground">
                            {products.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {products.map((product) => (
                            <MissingProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <MissingProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <div className="text-center py-12 px-6 border-2 border-dashed rounded-xl">
                      <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-semibold text-muted-foreground">
                        Nincs találat
                      </h3>
                      <p className="text-sm text-muted-foreground/80 mt-1">
                        Próbálj meg másra keresni vagy változtass a szűrőkön.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
