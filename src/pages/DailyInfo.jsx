
import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format, getDay, isPast, getWeek, addDays, subDays } from "date-fns";
import { hu } from "date-fns/locale";
import { Trash2, FileText, ListChecks, Plus, Search, X, PlusCircle, Check, CheckCircle2, ChevronDown, User, ImageIcon, Clock, ArrowLeft, Loader2, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import FileUploadWithOCR from "../components/FileUploadWithOCR";
import DailyInfoItem from "../components/daily_info/DailyInfoItem";
import AttachmentList from "../components/daily_info/AttachmentList";
import HorizontalDatepicker from "../components/daily_info/HorizontalDatepicker";
import { AnimatePresence, motion } from "framer-motion";

const safeParseDate = (dateString) => {
  if (!dateString) return null;
  
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
     if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  }

  const date = new Date(dateString);
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  
  return null;
};

// Magyar ünnepnapok 2025-re
const HUNGARIAN_HOLIDAYS_2025 = {
  '2025-01-01': 'Újév',
  '2025-03-15': 'Nemzeti ünnep',
  '2025-04-18': 'Nagypéntek',
  '2025-04-21': 'Húsvéthétfő',
  '2025-05-01': 'Munka ünnepe',
  '2025-06-09': 'Pünkösdhétfő',
  '2025-08-20': 'Szent István',
  '2025-10-23': 'Nemzeti ünnep',
  '2025-11-01': 'Mindenszentek',
  '2025-12-25': 'Karácsony',
  '2025-12-26': 'Karácsony 2. napja'
};

export default function DailyInfo() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isListScanOpen, setIsListScanOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrollToTaskId, setScrollToTaskId] = useState(null);
  const searchContainerRef = useRef(null);
  const [showActions, setShowActions] = useState(false);
  const [expandCompleted, setExpandCompleted] = useState(false); // New state for accordion
  const [swipeDirection, setSwipeDirection] = useState(0); // 0: none, -1: left (forward), 1: right (backward)
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const taskIdParam = urlParams.get('taskId');
    
    if (dateParam) {
      const parsedDate = safeParseDate(dateParam);
      if (parsedDate) {
        setSelectedDate(parsedDate);
      }
    }
    
    if (taskIdParam) {
      setTimeout(() => {
        setScrollToTaskId(taskIdParam);
      }, 300);
    }
  }, []);

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd'); 
  const isWeekend = getDay(selectedDate) === 0 || getDay(selectedDate) === 6;
  const currentWeek = getWeek(selectedDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const currentHoliday = HUNGARIAN_HOLIDAYS_2025[selectedDateKey];

  const { data: allDailyInfos, isLoading: isLoadingAll } = useQuery({
    queryKey: ['dailyInfos_all'],
    queryFn: () => supabaseClient.entities.DailyInfo.list('-date'),
    initialData: [],
  });

  const { data: attachments, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['attachments', selectedDateKey],
    queryFn: () => supabaseClient.entities.Attachment.filter({ date: selectedDateKey }, '-created_date'),
    initialData: [],
  });
  
  const createAttachmentMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.Attachment.bulkCreate(data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['attachments', selectedDateKey] });
        setShowActions(false);
    }
  });

  const handleCreateDailyInfoPlaceholder = () => {
      createAttachmentMutation.mutate([{
          date: selectedDateKey,
          title: `napi_info_${format(selectedDate, 'MM.dd')}`,
          status: 'pending',
          is_task_list: true
      }]);
      setShowActions(false);
  };

  const bulkCreateTasksMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.DailyInfo.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyInfos_all'] });
    },
  });

  const updateAttachmentMutation = useMutation({
    mutationFn: ({ id, data }) => supabaseClient.entities.Attachment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', selectedDateKey] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabaseClient.entities.DailyInfo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyInfos_all'] });
    },
  });
  
  const deleteMutation = useMutation({
      mutationFn: (id) => supabaseClient.entities.DailyInfo.delete(id),
      onSuccess: () => {
          queryClient.invalidateQueries({queryKey: ['dailyInfos_all']});
      }
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId) => {
        const attachmentToDelete = attachments.find(a => a.id === attachmentId);
        
        if (attachmentToDelete && attachmentToDelete.is_task_list) {
            const tasksToDelete = allDailyInfos.filter(
                info => info.date === attachmentToDelete.date
            );
            const deletePromises = tasksToDelete.map(task => supabaseClient.entities.DailyInfo.delete(task.id));
            await Promise.all(deletePromises);
        }
        
        return supabaseClient.entities.Attachment.delete(attachmentId);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['attachments', selectedDateKey] });
        queryClient.invalidateQueries({ queryKey: ['dailyInfos_all'] });
    },
  });

  const deleteDayMutation = useMutation({
    mutationFn: async (date) => {
      const dailyInfosToDelete = allDailyInfos.filter(info => info.date === date);
      const deleteDailyInfoPromises = dailyInfosToDelete.map(info => supabaseClient.entities.DailyInfo.delete(info.id));
      
      const attachmentsToDelete = await supabaseClient.entities.Attachment.filter({ date: date });
      const deleteAttachmentPromises = attachmentsToDelete.map(attachment => supabaseClient.entities.Attachment.delete(attachment.id));

      return Promise.all([...deleteDailyInfoPromises, ...deleteAttachmentPromises]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyInfos_all'] });
      queryClient.invalidateQueries({ queryKey: ['attachments', selectedDateKey] });
    },
  });

  const handleDocumentListExtracted = (results) => {
    const documentNames = results.flatMap(r => r.output?.documents || []);
    if (documentNames.length > 0) {
      const existingTitles = new Set(attachments.map(a => a.title));
      
      const attachmentPlaceholders = documentNames
        .filter(name => !existingTitles.has(name))
        .map(name => ({
          date: selectedDateKey,
          title: name,
          status: 'pending',
          is_task_list: name.toLowerCase().includes('napi_info')
        }));

      if (attachmentPlaceholders.length > 0) {
          createAttachmentMutation.mutate(attachmentPlaceholders);
      }
      setIsListScanOpen(false);
      setShowActions(false);
    }
  };

  const handleTaskListExtracted = async (results, attachmentId) => {
    const allImageUrls = results.map(r => r.imageUrl).filter(Boolean);

    const rawItems = results.flatMap(result => {
      if (!result.output || !result.output.informaciok) return [];
      const imageUrlForThisPage = result.imageUrl;
      return result.output.informaciok.map(item => ({
        ...item,
        itemImageUrls: item.tartalmaz_kepet ? [imageUrlForThisPage] : []
      }));
    });

    const todayDayName = format(selectedDate, 'eeee', { locale: hu });

    const itemsWithDeadlines = await Promise.all(rawItems.map(async (item) => {
      const title = item.tema || "Napi infó";
      const content = `${item.erintett ? 'Érintett: ' + item.erintett + '\n\n' : ''}${item.tartalom || ''}`;
      
      let deadline = null;
      try {
        const prompt = `
Elemezd a következő magyar nyelvű feladat szövegének a pontos határidő megállapításához.

**Környezeti információk:**
- A feladat létrehozásának dátuma: **${selectedDateKey}**
- Ez a nap egy **${todayDayName}**.

**Feladat:**
"${title} - ${content}"

**Utasítások a határidő megállapításához:**
1.  **Kulcsszavak:** Keresd a "határidő", "zárás", "napzárás", "eddig", "legkésőbb" szavakat.
2.  **Időpontok:**
    -   Ha a szövegben "napzárás" vagy "zárás" szerepel konkrét dátum nélkül, az a feladat létrehozásának napján (${selectedDateKey}) **22:00**-kor van.
    -   Ha csak egy óra van megadva (pl. "14:00-ig"), az a feladat létrehozásának napjára vonatkozik.
3.  **Napok:**
    -   **"ma"**: A feladat létrehozásának napja (${selectedDateKey}).
    -   **"holnap"**: A feladat létrehozásának napját követő nap.
    -   **Napnevek (hétfő, kedd, szerda, csütörtök, péntek, szombat, vasárnap):** A következő ilyen nevű napot keresd.
4.  **Konkrét dátumok:** Keresd a "hónap.nap" (pl. "10.25.") vagy "év.hónap.nap" formátumokat.
5.  **NINCS HATÁRIDŐ:** Ha a fenti szabályok egyike sem illeszkedik, akkor **NINCS HATÁRIDŐ**. Ebben az esetben a 'deadline' értéke **null** legyen.

**Válasz formátuma:**
A válaszod egy JSON objektum legyen.
-   If you found a deadline, the value of the 'deadline' key should be the EXACT date and time in **ISO 8601 format**.
-   If there is NO deadline, the value of the 'deadline' key should be **null**.
`;
        const deadlineResult = await supabaseClient.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              deadline: {
                type: ["string", "null"],
                format: "date-time"
              }
            }
          }
        });

        if (deadlineResult && deadlineResult.deadline) {
          deadline = deadlineResult.deadline;
        }
      } catch (e) {
        console.error("AI deadline extraction failed:", e);
      }

      return {
        date: selectedDateKey,
        title: title,
        content: content,
        image_urls: item.itemImageUrls,
        completed: false,
        deadline: deadline,
      };
    }));


    if (itemsWithDeadlines.length > 0) {
      bulkCreateTasksMutation.mutate(itemsWithDeadlines);
    }
    updateAttachmentMutation.mutate({ id: attachmentId, data: { status: 'uploaded', file_urls: allImageUrls } });
  };
  
  const handleAttachmentUploaded = (attachmentId, imageUrls) => {
    updateAttachmentMutation.mutate({ id: attachmentId, data: { status: 'uploaded', file_urls: imageUrls } });
  };

  const handleToggleCompleted = (info) => {
    updateMutation.mutate({ id: info.id, data: { completed: !info.completed } });
  };
  
  const infosForSelectedDay = useMemo(() => {
    return allDailyInfos
      .filter(info => info.date === selectedDateKey)
      .sort((a, b) => {
        // Sort by creation date (oldest first, as they were uploaded)
        const dateA = new Date(a.created_date);
        const dateB = new Date(b.created_date);
        return dateA.getTime() - dateB.getTime(); // Use getTime() for reliable comparison
      });
  }, [allDailyInfos, selectedDateKey]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const filtered = allDailyInfos.filter(
      (info) =>
        info.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        info.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const uniqueResults = Array.from(new Map(filtered.map(item => [item.id, item])).values());
    return uniqueResults;
  }, [searchTerm, allDailyInfos]);


  const displayInfos = searchTerm ? searchResults : infosForSelectedDay;

  const todoTasks = useMemo(() => displayInfos.filter(info => !info.completed), [displayInfos]);
  const doneTasks = useMemo(() => displayInfos.filter(info => info.completed), [displayInfos]);

  const hasDailyInfoPlaceholder = attachments.some(a => a.is_task_list);

  const sortedAttachments = useMemo(() => {
    if (!attachments) return [];
    return [...attachments].sort((a, b) => {
        const aIsNapiInfo = a.title.startsWith('napi_info');
        const bIsNapiInfo = b.title.startsWith('napi_info');

        if (aIsNapiInfo && !bIsNapiInfo) {
            return -1;
        }
        if (!aIsNapiInfo && bIsNapiInfo) {
            return 1;
        }
        return 0; 
    });
  }, [attachments]);

  const incompleteTaskDays = useMemo(() => {
    if (!allDailyInfos) return [];
    
    const taskDays = allDailyInfos.reduce((acc, task) => {
        const rawDateString = task.deadline || task.date;
        const parsedRawDate = safeParseDate(rawDateString);

        if (parsedRawDate) {
            const formattedRawDateKey = format(parsedRawDate, 'yyyy-MM-dd');

            if (task.hasOwnProperty('completed') && !task.completed) {
                const parsedDeadlineDate = safeParseDate(task.deadline);

                if (parsedDeadlineDate) {
                    if (isPast(parsedDeadlineDate) && format(parsedDeadlineDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) {
                        acc.add(format(new Date(), 'yyyy-MM-dd')); 
                    } else {
                        acc.add(format(parsedDeadlineDate, 'yyyy-MM-dd'));
                    }
                }
            } else {
                acc.add(formattedRawDateKey);
            }
        }
        return acc;
    }, new Set());
    return Array.from(taskDays).map(dateString => safeParseDate(dateString)).filter(Boolean);
  }, [allDailyInfos]);

  useEffect(() => {
    if (scrollToTaskId && displayInfos.length > 0) {
      // Check if task is in done tasks
      const isDoneTask = doneTasks.some(task => task.id === scrollToTaskId);
      
      // If it's a done task, expand the accordion first
      if (isDoneTask) {
        setExpandCompleted(true);
      }
      
      // Wait a bit longer for rendering, especially if accordion needs to expand
      setTimeout(() => {
        const element = document.querySelector(`[data-task-id="${scrollToTaskId}"]`);
        if (element) {
          // Scroll so the element is centered in the viewport
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
          
          window.scrollTo({ top: middle, behavior: 'smooth' });
          
          // Highlight the task with a more visible effect
          element.classList.add('ring-4', 'ring-primary/50', 'animate-pulse');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary/50', 'animate-pulse');
            setScrollToTaskId(null); // Clear the scroll ID after successful scroll and highlight
          }, 3000); // Increased highlight duration
        } else {
          // If element not found immediately, retry after a short delay.
          // This can happen if the component hasn't fully rendered or data is still processing.
          setTimeout(() => {
            const retryElement = document.querySelector(`[data-task-id="${scrollToTaskId}"]`);
            if (retryElement) {
              const elementRect = retryElement.getBoundingClientRect();
              const absoluteElementTop = retryElement.top + window.pageYOffset;
              const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
              
              window.scrollTo({ top: middle, behavior: 'smooth' });
              
              retryElement.classList.add('ring-4', 'ring-primary/50', 'animate-pulse');
              setTimeout(() => {
                retryElement.classList.remove('ring-4', 'ring-primary/50', 'animate-pulse');
                setScrollToTaskId(null);
              }, 3000); // Increased highlight duration
            } else {
              // If still not found, perhaps log an error or clear to prevent infinite retries
              console.warn(`Task with ID ${scrollToTaskId} not found after retries.`);
              setScrollToTaskId(null);
            }
          }, 500); // Small retry delay
        }
      }, 600); // Longer delay if accordion needs to expand, or for initial render
    }
  }, [scrollToTaskId, displayInfos, doneTasks]); // Add doneTasks to dependencies
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
        setSearchTerm('');
      }
    }

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    };

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchOpen]);
  
  const completionPercentage = useMemo(() => {
    if (infosForSelectedDay.length === 0) return 0;
    return Math.round((doneTasks.length / infosForSelectedDay.length) * 100);
  }, [infosForSelectedDay.length, doneTasks.length]);

  const handleSwipe = (direction) => {
    if (direction === 'left') { // swipe left to go to next day
      setSwipeDirection(-1);
      setTimeout(() => {
        setSelectedDate(addDays(selectedDate, 1));
        setSwipeDirection(0);
      }, 200); // Changed from 150 to 200
    } else if (direction === 'right') { // swipe right to go to previous day
      setSwipeDirection(1);
      setTimeout(() => {
        setSelectedDate(subDays(selectedDate, 1));
        setSwipeDirection(0);
      }, 200); // Changed from 150 to 200
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
       <style>{`
        .rdp-day_incomplete:not(.rdp-day_outside) {
          position: relative;
        }
        .rdp-day_incomplete:not(.rdp-day_outside)::after {
          content: '';
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: hsl(var(--destructive));
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Compact Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Napi infók</h1>
              <div className="flex items-center gap-2"> {/* Added flex container for date and badge */}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {format(selectedDate, 'yyyy. MMMM d., EEEE', { locale: hu })}
                </p>
                <Badge variant="outline" className="text-xs font-semibold">
                  {currentWeek}. hét
                </Badge>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </Button>
          </div>
          
          {infosForSelectedDay.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-300">Haladás</span>
                <span className="font-bold text-slate-900 dark:text-white">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-slate-600 dark:text-slate-300">{todoTasks.length} aktív</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-600 dark:text-slate-300">{doneTasks.length} kész</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              ref={searchContainerRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Keresés a feladatok között..."
                  className="pl-12 h-12 text-base border-2 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Date Picker */}
        {!isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <HorizontalDatepicker 
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate} 
              allDailyInfos={allDailyInfos}
              incompleteTaskDays={incompleteTaskDays}
            />
          </motion.div>
        )}

        {/* Swipeable Content Container - JAVÍTOTT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDateKey}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5} // Increased drag elastic
            dragMomentum={false}
            onDragEnd={(event, info) => {
              const swipeThreshold = 80; // Adjusted swipe threshold
              const velocity = Math.abs(info.velocity.x);
              
              if (info.offset.x > swipeThreshold || (info.offset.x > 30 && velocity > 500)) {
                handleSwipe('right');
              } else if (info.offset.x < -swipeThreshold || (info.offset.x < -30 && velocity > 500)) {
                handleSwipe('left');
              }
            }}
            initial={{ opacity: 0, x: swipeDirection === -1 ? 50 : swipeDirection === 1 ? -50 : 0 }}
            animate={{ 
              opacity: 1,
              x: 0,
            }}
            exit={{ 
              opacity: 0,
              x: swipeDirection === -1 ? -50 : swipeDirection === 1 ? 50 : 0,
            }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="space-y-4 mb-24"
          >
            {/* Tasks Section */}
            {!searchTerm && todoTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Tennivalók</h2>
                  <Badge variant="secondary" className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{todoTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {todoTasks.map((info) => (
                      <DailyInfoItem 
                        key={info.id}
                        info={info}
                        onToggleCompleted={() => handleToggleCompleted(info)}
                        isSearchResult={!!searchTerm}
                        updateMutation={updateMutation}
                        deleteMutation={deleteMutation}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {searchTerm && displayInfos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Keresési eredmények</h2>
                  <Badge variant="secondary" className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{displayInfos.length}</Badge>
                </div>
                <div className="space-y-2">
                  {displayInfos.map((info) => (
                    <DailyInfoItem 
                      key={info.id}
                      info={info}
                      onToggleCompleted={() => handleToggleCompleted(info)}
                      isSearchResult={!!searchTerm}
                      updateMutation={updateMutation}
                      deleteMutation={deleteMutation}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            
            {!searchTerm && doneTasks.length > 0 && (
              <Accordion 
                type="single" 
                collapsible 
                className="w-full"
                value={expandCompleted ? "completed" : undefined} // Controlled by state
                onValueChange={(value) => setExpandCompleted(value === "completed")} // Update state on change
              >
                <AccordionItem value="completed" className="border-none">
                  <Card className="shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Elvégezve</span>
                        <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                          {doneTasks.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-2 pt-2">
                        <AnimatePresence>
                          {doneTasks.map((info) => (
                            <DailyInfoItem 
                              key={info.id}
                              info={info}
                              onToggleCompleted={() => handleToggleCompleted(info)}
                              isSearchResult={!!searchTerm}
                              updateMutation={updateMutation}
                              deleteMutation={deleteMutation}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              </Accordion>
            )}

            {displayInfos.length === 0 && !attachmentsLoading && !isLoadingAll && (
              currentHoliday ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 px-6"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center">
                    <CalendarIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Munkaszüneti nap! 🎉</h3>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                    {currentHoliday}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Nincsenek feladatok erre a napra.
                  </p>
                </motion.div>
              ) : isWeekend && !searchTerm ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 px-6"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center">
                    <ListChecks className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hétvége! 🎉</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Nincsenek feladatok erre a napra.
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 px-6"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                    <ListChecks className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {searchTerm ? 'Nincs találat' : 'Nincs feladat'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {searchTerm ? 'Próbálj meg másra keresni.' : 'Válassz másik napot, vagy hozz létre új feladatokat.'}
                  </p>
                </motion.div>
              )
            )}
            
            <AttachmentList 
              attachments={sortedAttachments}
              onTaskListExtracted={handleTaskListExtracted}
              onAttachmentUploaded={handleAttachmentUploaded}
              onDeleteAttachment={(id) => deleteAttachmentMutation.mutate(id)}
            />
          </motion.div>
        </AnimatePresence>

        {/* Modern Floating Action Button */}
        <AnimatePresence>
          {!showActions ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="fixed bottom-20 right-6 z-20"
            >
              <Button
                onClick={() => setShowActions(true)}
                className="h-14 w-14 rounded-2xl shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0"
                size="icon"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-20 right-6 z-20 flex flex-col gap-2"
            >
              <Button
                onClick={handleCreateDailyInfoPlaceholder}
                disabled={hasDailyInfoPlaceholder || createAttachmentMutation.isLoading || isWeekend}
                className="h-12 px-5 rounded-xl shadow-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Napi infó
              </Button>
              
              <Dialog open={isListScanOpen} onOpenChange={setIsListScanOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="h-12 px-5 rounded-xl shadow-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    Doku lista
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dokumentumlista beolvasása</DialogTitle>
                  </DialogHeader>
                  <FileUploadWithOCR
                    onExtracted={handleDocumentListExtracted}
                    jsonSchema={{
                      type: "object",
                      properties: {
                        documents: {
                          type: "array",
                          description: "A képen látható összes dokumentumgomb szövegének listája.",
                          items: { type: "string" }
                        }
                      },
                      required: ["documents"]
                    }}
                    title="Húzd ide a képet, vagy fotózz"
                  />
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={() => setShowActions(false)}
                variant="ghost"
                className="h-12 w-12 rounded-xl shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 mx-auto border border-slate-200 dark:border-slate-700"
                size="icon"
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
