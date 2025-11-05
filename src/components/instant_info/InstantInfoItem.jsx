import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';

export default function InstantInfoItem({ info }) {
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: () => supabaseClient.entities.InstantInfo.update(info.id, { is_archived: true }),
    onSuccess: () => {
      // Invalidate both the specific day and the 'all' query for the date picker
      queryClient.invalidateQueries({ queryKey: ['instantInfos', info.date] });
      queryClient.invalidateQueries({ queryKey: ['instantInfos_all'] });
    },
  });

  return (
    <Card className="w-full bg-card border rounded-lg shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 text-left">
          <CardTitle className="font-semibold flex-1 text-foreground">
            {info.title}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground self-start sm:self-center flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(info.created_date), 'yyyy. MMMM d.', { locale: hu })}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
            {info.content}
        </p>
      </CardContent>
      <CardFooter className="p-4 flex justify-end bg-muted/50">
        <Button
            variant="outline"
            size="sm"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isLoading}
        >
            <Archive className="w-4 h-4 mr-2" />
            Archiválás
        </Button>
      </CardFooter>
    </Card>
  );
}