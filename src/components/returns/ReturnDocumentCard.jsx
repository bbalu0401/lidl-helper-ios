import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, FileText } from 'lucide-react';

export default function ReturnDocumentCard({ document, onDelete, itemCount }) {
  return (
    <Card className="p-3 flex items-center gap-4">
      <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        <img src={document.document_url} alt="Bizonylat" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground">Bizonylat</p>
            {document.processed ? 
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{itemCount} tétel</Badge> :
                <Badge variant="outline">Feldolgozás alatt</Badge>
            }
        </div>
        {document.document_number && (
            <p className="text-sm text-muted-foreground">Szám: {document.document_number}</p>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(document.id)}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </Card>
  );
}