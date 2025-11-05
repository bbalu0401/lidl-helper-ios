
import React, { useState } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { PlusCircle, Info, CalendarDays } from "lucide-react";
import { getWeek } from 'date-fns';
import WeekDropdownSelector from '../components/shared/WeekDropdownSelector';
import WeeklyInfoItem from "../components/weekly_info/WeeklyInfoItem";
import FileUploadWithOCR from "../components/FileUploadWithOCR";
import { motion } from "framer-motion";

export default function WeeklyInfo() {
  const [currentWeek, setCurrentWeek] = useState(getWeek(new Date(), { weekStartsOn: 1, firstWeekContainsDate: 4 }));
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: weeklyInfos, isLoading } = useQuery({
    queryKey: ['weeklyInfos', currentWeek],
    queryFn: () => supabaseClient.entities.WeeklyInfo.filter({ week_number: currentWeek, is_archived: false }, '-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.WeeklyInfo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyInfos', currentWeek] });
      setIsCreateOpen(false);
    },
  });

  const handleOcrExtract = (results) => {
    if (results && results.length > 0 && results[0]?.output) {
        const { title, content } = results[0].output;
        if (title && content) {
          createMutation.mutate({ title, content, week_number: currentWeek });
        }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Heti infók
              </h1>
              <p className="text-muted-foreground">
                Heti szintű közlemények és feladatok
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg">
                <PlusCircle className="w-4 h-4 mr-2" />
                Új heti infó
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új heti infó feltöltése a(z) {currentWeek}. hétre</DialogTitle>
                <DialogDescription>
                    Tölts fel egy képet vagy PDF-et a heti információról. A rendszer automatikusan kinyeri a címet és a tartalmat, majd elmenti.
                </DialogDescription>
              </DialogHeader>
              <div className="pt-4">
                <FileUploadWithOCR
                  onExtracted={handleOcrExtract}
                  jsonSchema={{
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: "A dokumentum legkiemelkedőbb, legnagyobb betűméretű címe."
                      },
                      content: {
                        type: "string",
                        description: "A képen látható teljes szöveges tartalom, a cím nélkül."
                      }
                    },
                    required: ["title", "content"]
                  }}
                  title="Húzd ide a képet, vagy fotózz"
                />
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <WeekDropdownSelector currentWeek={currentWeek} onWeekChange={setCurrentWeek} />

        {isLoading ? (
          <p>Töltés...</p>
        ) : weeklyInfos.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {weeklyInfos.map((info) => (
              <WeeklyInfoItem key={info.id} info={info} />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-6 border-2 border-dashed rounded-xl"
          >
            <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-muted-foreground">Nincsenek közlemények a(z) {currentWeek}. hétre</h3>
            <p className="text-sm text-muted-foreground/80 mt-1">
              Hozzon létre egyet, vagy válasszon másik hetet.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
