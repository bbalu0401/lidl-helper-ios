import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function DataTable({ headers, rows }) {
  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-4">
      {rows.map((row, rowIndex) => (
        <Card key={rowIndex} className="bg-muted/50">
          <CardContent className="p-4 space-y-3">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {headers[cellIndex] || `Adat ${cellIndex + 1}`}
                </p>
                <p className="font-medium text-foreground">{cell}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}