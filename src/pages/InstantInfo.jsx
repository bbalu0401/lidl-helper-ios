
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
import { PlusCircle, Megaphone, AlertTriangle } from "lucide-react";
import InstantInfoItem from "../components/instant_info/InstantInfoItem";
import { format, addDays, subDays } from 'date-fns'; // Added addDays, subDays
import { hu } from 'date-fns/locale';
import FileUploadWithOCR from "../components/FileUploadWithOCR";
import HorizontalDatepicker from "../components/daily_info/HorizontalDatepicker";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence

export default function InstantInfo() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [swipeDirection, setSwipeDirection] = useState(0); // 0: no swipe, 1: right swipe (to previous day), -1: left swipe (to next day)
  
  const queryClient = useQueryClient();
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');

  const { data: instantInfos, isLoading } = useQuery({
    queryKey: ['instantInfos', selectedDateKey],
    queryFn: () => supabaseClient.entities.InstantInfo.filter({ is_archived: false, date: selectedDateKey }, '-created_date'),
    initialData: [],
  });

  // Query to get all infos for date picker indicators (optional)
  const { data: allInstantInfos } = useQuery({
    queryKey: ['instantInfos_all'],
    queryFn: () => supabaseClient.entities.InstantInfo.list(), // Fetches all instant infos
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.InstantInfo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instantInfos', selectedDateKey] });
      queryClient.invalidateQueries({ queryKey: ['instantInfos_all'] }); // Invalidate all infos to update date picker indicators
      setIsCreateOpen(false);
    },
  });

  const handleOcrExtract = (results) => {
    if (results && results.length > 0 && results[0]?.output) {
      const { title, content } = results[0].output;
      if (title && content) {
        createMutation.mutate({ title, content, date: selectedDateKey });
      }
    }
  };

  const handleSwipe = (direction) => {
    // 'left' swipe means user wants to see the next day's content.
    // The current content should exit left, and new content should enter from the right.
    // So, set swipeDirection to -1 (representing old content moving towards negative X).
    if (direction === 'left') {
      setSwipeDirection(-1);
      setSelectedDate(addDays(selectedDate, 1));
    } 
    // 'right' swipe means user wants to see the previous day's content.
    // The current content should exit right, and new content should enter from the left.
    // So, set swipeDirection to 1 (representing old content moving towards positive X).
    else if (direction === 'right') {
      setSwipeDirection(1);
      setSelectedDate(subDays(selectedDate, 1));
    }
    // swipeDirection will hold its value until the next swipe,
    // ensuring correct entry/exit animation for the new component instance.
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
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Azonnali infók
              </h1>
              <p className="text-muted-foreground">
                Rendkívüli vagy sürgős közlemények
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg">
                <PlusCircle className="w-4 h-4 mr-2" />
                Új azonnali infó
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új azonnali infó feltöltése</DialogTitle>
                <DialogDescription>
                  Tölts fel egy képet vagy PDF-et az információról. A rendszer automatikusan kinyeri a címet és a tartalmat, majd elmenti a mai napra.
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
        
        <HorizontalDatepicker 
            selectedDate={selectedDate} 
            setSelectedDate={setSelectedDate}
            // Passing allInstantInfos to show indicators on days with infos.
            // We need a way to check which days have items. We'll map it.
            allDailyInfos={allInstantInfos.map(info => ({ date: info.date, completed: true }))} // Adapt to the picker's expected format
        />

        {/* AnimatePresence enables exit animations for components that are removed from the DOM */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDateKey} // Key changes when selectedDate changes, triggering animations
            drag="x"
            dragConstraints={{ left: 0, right: 0 }} // Constrain drag to horizontal axis
            dragElastic={0.5} // How much the item can be "pulled" past the constraint
            dragMomentum={false} // Disable momentum for snappier control
            onDragEnd={(event, info) => {
              const swipeThreshold = 80; // Distance to drag to trigger a swipe
              const velocityThreshold = 500; // Velocity to trigger a swipe if distance is small
              
              if (info.offset.x > swipeThreshold || (info.offset.x > 30 && info.velocity.x > velocityThreshold)) {
                handleSwipe('right'); // Swiped right (to previous day)
              } else if (info.offset.x < -swipeThreshold || (info.offset.x < -30 && info.velocity.x < -velocityThreshold)) {
                handleSwipe('left'); // Swiped left (to next day)
              }
            }}
            initial={{ 
              opacity: 0, 
              // Set initial X based on the swipe direction that triggered the new content
              x: swipeDirection === -1 ? '100%' : swipeDirection === 1 ? '-100%' : 0 
            }}
            animate={{ 
              opacity: 1,
              x: 0, // Animate to central position
            }}
            exit={{ 
              opacity: 0,
              // Set exit X based on the swipe direction (old content moving out)
              x: swipeDirection === -1 ? '-100%' : swipeDirection === 1 ? '100%' : 0, 
            }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 },
              x: { duration: 0.3 } // X transition duration
            }}
            className="mt-8 space-y-4"
          >
              {isLoading ? (
                <p>Töltés...</p>
              ) : instantInfos.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {instantInfos.map((info) => (
                    <InstantInfoItem key={info.id} info={info} />
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 px-6 border-2 border-dashed rounded-xl"
                >
                  <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Nincsenek közlemények a(z) {format(selectedDate, 'yyyy. MMMM d.', { locale: hu })} napra</h3>
                  <p className="text-sm text-muted-foreground/80 mt-1">
                    Hozzon létre egyet, vagy válasszon másik napot.
                  </p>
                </motion.div>
              )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
