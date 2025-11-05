import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/api/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Save, X, ClipboardList } from "lucide-react";
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

export default function ReturnItemCard({ item }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedQuantity, setEditedQuantity] = useState(item.quantity ?? '');
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => supabaseClient.entities.ReturnItem.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['returnItems', item.week_number] });
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => supabaseClient.entities.ReturnItem.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['returnItems', item.week_number] });
        },
    });

    useEffect(() => {
        setEditedQuantity(item.quantity ?? '');
    }, [item.quantity]);
    
    const handleSave = () => {
        const newQuantity = editedQuantity === '' ? null : parseInt(editedQuantity, 10);
        if (newQuantity !== item.quantity) {
            updateMutation.mutate({ id: item.id, data: { quantity: newQuantity } });
        } else {
            setIsEditing(false);
        }
    };
    
    const handleCancel = () => {
        setEditedQuantity(item.quantity ?? '');
        setIsEditing(false);
    };

    return (
        <div className={`p-3 sm:p-4 rounded-lg border transition-colors relative bg-card`}>
            <div className="absolute top-1 right-1 flex items-center">
                {!isEditing && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditing(true)}>
                        <Pencil className="w-4 h-4"/>
                    </Button>
                )}
            </div>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 space-y-1 pr-10">
                    <p className="font-semibold text-foreground text-base">
                        {item.product_name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        Cikkszám: {item.barcode}
                    </p>
                     {item.planned_quantity !== null && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            <ClipboardList className="w-3.5 h-3.5"/>
                            <span >Terv: {item.planned_quantity} db</span>
                        </div>
                     )}
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={editedQuantity}
                                onChange={(e) => setEditedQuantity(e.target.value)}
                                className="w-24 h-10 text-center text-lg"
                                autoFocus
                            />
                            <Button size="icon" onClick={handleSave} disabled={updateMutation.isLoading}>
                                <Save className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancel}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                         <div className="flex flex-col items-end gap-1 text-right">
                           <span className="text-lg font-bold">{item.quantity ?? 0} db</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}