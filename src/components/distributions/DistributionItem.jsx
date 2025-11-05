
import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/api/supabaseClient';
import _ from 'lodash';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Check, Plus, Minus, X } from "lucide-react";

export default function DistributionItem({ distribution }) {
    const [received, setReceived] = useState(distribution.received_quantity ?? '');
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => supabaseClient.entities.Distribution.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['distributions'] });
        },
    });

    const handleManualUpdate = () => {
        const receivedValue = received === '' ? null : parseInt(received, 10);
        if (receivedValue === distribution.received_quantity) return;

        let newStatus = 'pending';
        if (receivedValue !== null) {
            newStatus = receivedValue === distribution.quantity ? 'ok' : 'discrepancy';
        }
        updateMutation.mutate({ id: distribution.id, data: { received_quantity: receivedValue, status: newStatus } });
    };

    // Sync state if prop changes from parent (e.g., after mutation)
    useEffect(() => {
        const propValue = distribution.received_quantity ?? '';
        if (String(propValue) !== String(received)) {
            setReceived(propValue);
        }
    }, [distribution.received_quantity]);

    const handleQuickSetCorrect = () => {
        const newReceived = distribution.quantity;
        updateMutation.mutate({ id: distribution.id, data: { received_quantity: newReceived, status: 'ok' } });
        setReceived(newReceived); // Immediately update local state
    };
    
    const handleReset = () => {
        updateMutation.mutate({ id: distribution.id, data: { received_quantity: null, status: 'pending' } });
        setReceived('');
    };
    
    const handleQuantityChange = (newValue) => {
        // Allow empty string to clear the input, otherwise clamp to min 0
        if (newValue === '') {
            setReceived('');
        } else {
            const numValue = Math.max(0, parseInt(newValue, 10) || 0);
            setReceived(numValue);
        }
    };

    const statusStyles = {
        pending: 'bg-background border-border',
        ok: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        discrepancy: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    };
    const difference = distribution.received_quantity !== null ? distribution.received_quantity - distribution.quantity : 0;
    
    // Determine if the current "received" value in the input is different from the saved value
    const isDirty = (distribution.received_quantity ?? '') !== received;

    return (
        <div className={`p-3 sm:p-4 rounded-lg border transition-colors relative ${statusStyles[distribution.status]}`}>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                {/* Product Info */}
                <div className="flex-1">
                    <p className="font-semibold text-foreground text-base">
                        {distribution.article_number}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {distribution.product_name}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-2">
                        Várt: <span className="font-bold">{distribution.quantity}</span> {distribution.unit === 'db' ? 'db' : 'karton'}
                    </p>
                </div>

                {/* Interaction Area */}
                <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                    {distribution.status === 'pending' ? (
                        <>
                            <Button
                                size="lg"
                                className="bg-green-500 hover:bg-green-600 h-12 w-12 p-0"
                                onClick={handleQuickSetCorrect}
                            >
                                <Check className="w-6 h-6" />
                            </Button>
                            <div className="flex items-center gap-1">
                                <Button size="icon" variant="outline" className="h-12 w-12" onClick={() => handleQuantityChange((parseInt(received) || 0) - 1)}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={received}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    className="w-20 h-12 text-center text-xl font-bold"
                                />
                                <Button size="icon" variant="outline" className="h-12 w-12" onClick={() => handleQuantityChange((parseInt(received) || 0) + 1)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {isDirty && (
                                <Button className="h-12" onClick={handleManualUpdate}>Mentés</Button>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-end gap-2">
                             <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleReset}>
                                <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <div className="flex items-center gap-2 text-lg font-bold">
                                {distribution.status === 'ok' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                                {distribution.status === 'discrepancy' && <AlertTriangle className="w-6 h-6 text-red-600" />}
                                <span>{distribution.received_quantity} {distribution.unit === 'db' ? 'db' : 'karton'}</span>
                            </div>
                            {distribution.status === 'discrepancy' && (
                                <p className={`text-sm font-semibold ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Eltérés: {difference > 0 ? `+${difference}` : difference}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
