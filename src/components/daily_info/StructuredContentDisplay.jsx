import React from 'react';
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';

const preProcessText = (text) => {
    // Keresi a 6-7 számjegyű cikkszámokat, és eléjük tesz egy sortörést, ha még nincs ott.
    // Ez segít az MI-nek jobban felismerni a sorokat.
    return text.replace(/(\s)(\d{6,7}\s)/g, '\n$2');
};

const TwoColumnTable = ({ data }) => (
    <div className="border rounded-lg overflow-hidden">
        <div className="divide-y">
            {data.map((row, index) => (
                <div key={index} className="flex flex-col sm:flex-row text-sm even:bg-muted/50 p-3">
                    <div className="sm:w-1/3 font-semibold text-foreground mb-1 sm:mb-0">{row.key}</div>
                    <div className="flex-1 text-muted-foreground">{row.value}</div>
                </div>
            ))}
        </div>
    </div>
);

export default function StructuredContentDisplay({ content }) {
    const { data: parsedData, isLoading } = useQuery({
        queryKey: ['structuredContent_v3', content],
        queryFn: async () => {
            const preProcessedContent = preProcessText(content);
            try {
                const prompt = `
                    **TASK:** Analyze the following text and parse it into three parts: a leading description, a table of items, and a trailing description.

                    **INPUT TEXT:**
                    ---
                    ${preProcessedContent}
                    ---

                    **INSTRUCTIONS:**
                    1.  **leading_description**: This is the text that appears *before* the main item list/table. It's usually an introduction.
                    2.  **items**: This is the core part. Look for a list of items, typically with an article number (Artikelnummer/Cikkszám, 6-7 digits) and a product name. Parse this into a JSON array of objects, where each object has a "key" (the article number) and a "value" (the product name and any other info on that line).
                    3.  **trailing_description**: This is any text that appears *after* the item list, like a deadline ("Határidő: ...").

                    **CRITICAL RULES:**
                    - If the text does **NOT** contain a clear, multi-row list of items with article numbers, then set "items" to an empty array \`[]\` and put the ENTIRE original text into "leading_description". Do not invent a table.
                    - If there is no leading or trailing text, the corresponding value should be an empty string "".

                    **OUTPUT FORMAT (JSON only):**
                    {
                      "leading_description": "...",
                      "items": [ { "key": "...", "value": "..." }, ... ],
                      "trailing_description": "..."
                    }
                `;

                const result = await supabaseClient.integrations.Core.InvokeLLM({ 
                    prompt: prompt,
                    response_json_schema: {
                        "type": "object",
                        "properties": {
                            "leading_description": {"type": "string"},
                            "items": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "key": {"type": "string"},
                                        "value": {"type": "string"}
                                    },
                                    "required": ["key", "value"]
                                }
                            },
                            "trailing_description": {"type": "string"}
                        },
                        "required": ["leading_description", "items", "trailing_description"]
                    }
                 });
                return result;
            } catch (error) {
                console.error("AI parsing failed, falling back to plain text:", error);
                // On error, return a structure that displays the original content safely.
                return { leading_description: content, items: [], trailing_description: "" };
            }
        },
        staleTime: 1000 * 60 * 60, // 1 hour
        cacheTime: 1000 * 60 * 60 * 24, // 24 hours
        enabled: !!content,
    });
    
    if (isLoading) {
        return (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground animate-pulse mt-4">
                Tartalom elemzése...
            </div>
        );
    }
    
    // Fallback for failed parsing or if no table was found
    if (!parsedData || (parsedData.items.length === 0 && !parsedData.leading_description && !parsedData.trailing_description)) {
         return (
            <div className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
                {content}
            </div>
        );
    }
    
    // If AI decided it's not a table, it puts everything in leading_description.
    if(parsedData.items.length === 0) {
        return (
             <div className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
                {parsedData.leading_description}
            </div>
        )
    }

    // Render the structured view
    return (
        <div className="space-y-4">
            {parsedData.leading_description && (
                <div className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
                    {parsedData.leading_description}
                </div>
            )}
            
            {parsedData.items.length > 0 && <TwoColumnTable data={parsedData.items} />}
            
            {parsedData.trailing_description && (
                <div className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
                    {parsedData.trailing_description}
                </div>
            )}
        </div>
    );
}