import React, { useMemo, useState, useRef } from 'react';
import { Clock, Check, Trash2, User, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { format, isPast } from 'date-fns';
import { hu } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import StructuredContentDisplay from './StructuredContentDisplay';

const safeParseDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return (date instanceof Date && !isNaN(date.getTime())) ? date : null;
};

export default function DailyInfoItem({ info, onToggleCompleted, isSearchResult, updateMutation, deleteMutation }) {
    const [showMenu, setShowMenu] = useState(false);
    const longPressTimer = useRef(null);
    const [pressing, setPressing] = useState(false);

    const deadlineDate = useMemo(() => safeParseDate(info.deadline), [info.deadline]);
    const infoDate = useMemo(() => safeParseDate(info.date), [info.date]);

    const isOverdue = !info.completed && deadlineDate && isPast(deadlineDate);
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { 
            opacity: 0, 
            scale: 0.95,
            transition: { duration: 0.2 } 
        },
    };

    const { erintett, mainContent } = useMemo(() => {
        const content = info.content || '';
        const erintettRegex = /Érintett:\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i;
        const match = content.match(erintettRegex);
        
        let erintettText = null;
        let restOfContent = content;

        if (match && match[1]) {
            erintettText = match[1].trim();
            restOfContent = content.replace(erintettRegex, '').trim();
        }

        if (restOfContent.includes('Jelentés:')) {
            restOfContent = restOfContent.replace(/\? /g, '?\n');
        }

        return { erintett: erintettText, mainContent: restOfContent };
    }, [info.content]);

    const handleTouchStart = (e) => {
        setPressing(true);
        longPressTimer.current = setTimeout(() => {
            setShowMenu(true);
            setPressing(false);
            // Vibráció, ha elérhető
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500); // 500ms hosszú nyomás
    };

    const handleTouchEnd = () => {
        setPressing(false);
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleMouseDown = (e) => {
        // Desktop támogatás
        setPressing(true);
        longPressTimer.current = setTimeout(() => {
            setShowMenu(true);
            setPressing(false);
        }, 500);
    };

    const handleMouseUp = () => {
        setPressing(false);
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleMenuAction = (action) => {
        if (action === 'toggle') {
            onToggleCompleted();
        }
        setShowMenu(false);
    };

    return (
        <AnimatePresence mode="popLayout">
            <motion.div
               layout
               variants={itemVariants}
               initial="hidden"
               animate="visible"
               exit="exit"
               className="relative"
               data-task-id={info.id}
            >
                {/* Hosszú nyomás menü */}
                <AnimatePresence>
                    {showMenu && (
                        <>
                            {/* Háttér overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/20 z-40"
                                onClick={() => setShowMenu(false)}
                            />
                            
                            {/* Menü */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border-2 border-border rounded-2xl shadow-2xl p-2 min-w-[200px]"
                            >
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 h-12 text-base font-semibold hover:bg-accent"
                                    onClick={() => handleMenuAction('toggle')}
                                >
                                    {info.completed ? (
                                        <>
                                            <X className="w-5 h-5 text-red-500" />
                                            <span>Visszavonás</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5 text-green-500" />
                                            <span>Elvégezve</span>
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-center h-10 text-sm text-muted-foreground hover:bg-accent"
                                    onClick={() => setShowMenu(false)}
                                >
                                    Bezárás
                                </Button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Fő kártya tartalom */}
                <motion.div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    animate={{ scale: pressing ? 0.98 : 1 }}
                    transition={{ duration: 0.1 }}
                    className="relative"
                >
                    <Card className={`w-full border-2 shadow-lg overflow-hidden transition-all ${
                        info.completed 
                            ? 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-4">
                                <CardTitle className={`flex-1 text-base ${
                                    info.completed 
                                        ? 'line-through text-slate-400 dark:text-slate-500' 
                                        : 'text-slate-900 dark:text-white'
                                }`}>
                                    {info.title}
                                </CardTitle>
                                {isSearchResult && infoDate && (
                                    <Badge variant="outline" className="shrink-0">
                                        {format(infoDate, 'MM.dd', { locale: hu })}
                                    </Badge>
                                )}
                            </div>
                           
                            {deadlineDate && (
                                <div className="flex items-center gap-2 pt-2">
                                     <Badge 
                                        variant={isOverdue ? "destructive" : "secondary"} 
                                        className={`gap-1.5 ${
                                            info.completed 
                                                ? 'opacity-50' 
                                                : ''
                                        }`}
                                    >
                                        <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-white' : ''}`}/>
                                        <span className={`font-medium capitalize`}>
                                            {format(deadlineDate, 'MMM d., eeee HH:mm', { locale: hu })}
                                        </span>
                                    </Badge>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className={info.completed ? 'opacity-60' : ''}>
                             {erintett && (
                                <div className="relative mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 dark:border-blue-400/30 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                            <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">
                                                Érintett
                                            </div>
                                            <div className="text-base font-bold text-blue-900 dark:text-blue-100">
                                                {erintett}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <StructuredContentDisplay content={mainContent} />
                        </CardContent>
                        <CardFooter className="p-4 flex justify-end border-t border-slate-100 dark:border-slate-800">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Törlés
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Biztosan törlöd ezt a feladatot?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        "{info.title}" - Ez a művelet nem vonható vissza.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => deleteMutation.mutate(info.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                      Törlés
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                        </CardFooter>
                    </Card>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}