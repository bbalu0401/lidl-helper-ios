import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/api/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Package, Edit2, Image as ImageIcon, CheckCircle, AlertTriangle, Clock, TruckIcon, Snowflake, Refrigerator, Croissant, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  open: {
    label: 'Nyitott',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    badgeColor: 'bg-yellow-500'
  },
  in_stock: {
    label: 'Raktáron van',
    icon: Package,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    badgeColor: 'bg-blue-500'
  },
  wrong_inventory: {
    label: 'Rossz készlet',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    badgeColor: 'bg-red-500'
  },
  arriving_soon: {
    label: 'Beérkezés várható',
    icon: TruckIcon,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    badgeColor: 'bg-purple-500'
  },
  resolved: {
    label: 'Megoldva',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    badgeColor: 'bg-green-500'
  }
};

const CATEGORIES = {
  troso: { label: "Troso", icon: Package },
  mopro: { label: "Mopro", icon: Refrigerator },
  tiko: { label: "Tiko", icon: Snowflake },
  bakeoff: { label: "Bakeoff", icon: Croissant }
};

export default function MissingProductCard({ product }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(product.notes || '');
  const [isImageOpen, setIsImageOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabaseClient.entities.MissingProduct.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missingProducts'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabaseClient.entities.MissingProduct.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missingProducts'] });
    },
  });

  const handleStatusChange = (newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'resolved' && !product.resolved_date) {
      updateData.resolved_date = format(new Date(), 'yyyy-MM-dd');
    }
    updateMutation.mutate({ id: product.id, data: updateData });
  };

  const handleCategoryChange = (newCategory) => {
    updateMutation.mutate({ id: product.id, data: { category: newCategory } });
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({ id: product.id, data: { notes: editedNotes } });
  };

  const statusConfig = STATUS_CONFIG[product.status];
  const StatusIcon = statusConfig.icon;
  
  const categoryConfig = CATEGORIES[product.category];
  const CategoryIcon = categoryConfig?.icon || Package;

  return (
    <Card className={`border-2 transition-all ${product.status === 'resolved' ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${statusConfig.badgeColor} flex items-center justify-center flex-shrink-0`}>
            <StatusIcon className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-2xl font-black font-mono text-foreground leading-tight tracking-tight">
                    {product.article_number}
                  </p>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <CategoryIcon className="w-3 h-3" />
                    {categoryConfig?.label}
                  </Badge>
                </div>
                <h3 className="font-semibold text-base text-muted-foreground leading-tight">
                  {product.product_name}
                </h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="flex gap-1">
                {product.image_url && (
                  <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Ártábla képe</DialogTitle>
                      </DialogHeader>
                      <img 
                        src={product.image_url} 
                        alt="Ártábla" 
                        className="w-full rounded-lg"
                      />
                    </DialogContent>
                  </Dialog>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Biztosan törlöd ezt a terméket?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-mono font-bold">{product.article_number}</span> - {product.product_name}
                        <br />
                        Ez a művelet nem vonható vissza.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Mégse</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate(product.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Törlés
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-3 mt-3">
              <Select value={product.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="troso">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Troso (szárazáru)
                    </div>
                  </SelectItem>
                  <SelectItem value="mopro">
                    <div className="flex items-center gap-2">
                      <Refrigerator className="w-4 h-4" />
                      Mopro (hűtött)
                    </div>
                  </SelectItem>
                  <SelectItem value="tiko">
                    <div className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4" />
                      Tiko (fagyasztott)
                    </div>
                  </SelectItem>
                  <SelectItem value="bakeoff">
                    <div className="flex items-center gap-2">
                      <Croissant className="w-4 h-4" />
                      Bakeoff (pékáru)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={product.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Nyitott
                    </div>
                  </SelectItem>
                  <SelectItem value="in_stock">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Raktáron van
                    </div>
                  </SelectItem>
                  <SelectItem value="wrong_inventory">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Rossz készlet
                    </div>
                  </SelectItem>
                  <SelectItem value="arriving_soon">
                    <div className="flex items-center gap-2">
                      <TruckIcon className="w-4 h-4" />
                      Beérkezés várható
                    </div>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Megoldva
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Jegyzetek (pl. raktár 3. sor, új szállítmány jövő héten...)"
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes}>
                      Mentés
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setIsEditing(false);
                      setEditedNotes(product.notes || '');
                    }}>
                      Mégse
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {product.notes ? (
                    <div className="p-3 bg-muted/50 rounded-lg relative group">
                      <p className="text-sm text-foreground whitespace-pre-wrap pr-8">
                        {product.notes}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Jegyzetek hozzáadása
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}