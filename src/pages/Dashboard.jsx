import React, { useMemo } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  FileText, 
  Package, 
  RotateCcw, 
  ArrowRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  CalendarIcon,
  PackageX,
  Truck,
  CalendarDays,
  Zap,
  Users,
  ChevronRight
} from "lucide-react";
import { format, getWeek, isSameDay, isPast, startOfDay } from "date-fns";
import { hu } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

const safeParseDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return (date instanceof Date && !isNaN(date.getTime())) ? date : null;
};

const FocusCard = ({ title, value, subtitle, icon: Icon, gradient, linkTo, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex-shrink-0 w-[280px] snap-start"
    >
      <Link to={linkTo}>
        <Card className={`h-full bg-gradient-to-br ${gradient} border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/70" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white/90">{title}</p>
              <p className="text-4xl font-bold text-white">{value}</p>
              {subtitle && <p className="text-xs text-white/80">{subtitle}</p>}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

const QuickActionButton = ({ icon: Icon, label, linkTo, gradient, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Link to={linkTo}>
        <Button 
          variant="outline" 
          className={`w-full h-24 flex flex-col gap-2 justify-center bg-gradient-to-br ${gradient} border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105`}
        >
          <Icon className="w-6 h-6 text-white" />
          <span className="text-sm font-semibold text-white">{label}</span>
        </Button>
      </Link>
    </motion.div>
  );
};

export default function Dashboard() {
  const { data: allDailyInfos } = useQuery({
    queryKey: ['dailyInfos_all'],
    queryFn: () => supabaseClient.entities.DailyInfo.list('-date'),
    initialData: [],
  });

  const { data: distributions } = useQuery({
    queryKey: ['distributions'],
    queryFn: () => supabaseClient.entities.Distribution.list('-date', 10),
    initialData: [],
  });

  const { data: returnItems } = useQuery({
    queryKey: ['returnItems'],
    queryFn: () => supabaseClient.entities.ReturnItem.list('-created_date', 10),
    initialData: [],
  });

  const { data: missingProducts } = useQuery({
    queryKey: ['missingProducts'],
    queryFn: () => supabaseClient.entities.MissingProduct.list('-created_date', 20),
    initialData: [],
  });

  const { data: weeklyInfos } = useQuery({
    queryKey: ['weeklyInfos'],
    queryFn: () => supabaseClient.entities.WeeklyInfo.list('-created_date', 5),
    initialData: [],
  });

  const today = startOfDay(new Date());
  const todayFormatted = format(today, 'yyyy-MM-dd');
  const currentWeek = getWeek(new Date(), { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const isHoliday = HUNGARIAN_HOLIDAYS_2025[todayFormatted];

  const todayTasks = useMemo(() => {
    const todayDateKey = format(today, 'yyyy-MM-dd');
    return allDailyInfos.filter(task => {
      if (task.completed) return false;
      if (task.date === todayDateKey) return true;
      if (task.deadline) {
        const deadlineDate = safeParseDate(task.deadline);
        if (deadlineDate && isSameDay(deadlineDate, today)) return true;
      }
      return false;
    });
  }, [allDailyInfos, today]);

  const overdueTasks = useMemo(() => {
    return allDailyInfos.filter(task => {
      if (task.completed || !task.deadline) return false;
      const deadlineDate = safeParseDate(task.deadline);
      if (!deadlineDate) return false;
      return isPast(deadlineDate) && !isSameDay(deadlineDate, today);
    });
  }, [allDailyInfos, today]);

  const openMissingProducts = missingProducts.filter(p => p.status === 'open').length;
  const checkedDistributions = distributions.filter(d => d.status !== 'pending').length;
  const totalDistributions = distributions.length;

  const allTasksComplete = overdueTasks.length === 0 && todayTasks.length === 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Jó reggelt";
    if (hour < 18) return "Szép napot";
    return "Jó estét";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">{getGreeting()}!</span>
            </motion.div>
            
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              {allTasksComplete ? "Minden rendben! 🎉" : overdueTasks.length > 0 ? `${overdueTasks.length} Lejárt Feladat! ⚠️` : `${todayTasks.length} Feladat Vár Ma`}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-white/90">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {format(new Date(), 'yyyy. MMMM d., EEEE', { locale: hu })}
                </span>
              </div>
              <span className="text-white/50">•</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30">
                {currentWeek}. hét
              </Badge>
              {isHoliday && (
                <>
                  <span className="text-white/50">•</span>
                  <Badge className="bg-red-500/30 text-white border-0 hover:bg-red-500/40">
                    🎉 {isHoliday}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Horizontal Scrollable Focus Cards */}
        <div className="space-y-3">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-bold text-slate-900 dark:text-white px-2"
          >
            A mai nap fókuszában
          </motion.h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide px-2">
            {overdueTasks.length > 0 && (
              <FocusCard
                title="Lejárt feladatok"
                value={overdueTasks.length}
                subtitle={overdueTasks[0]?.title || ""}
                icon={AlertTriangle}
                gradient="from-red-500 to-orange-500"
                linkTo={createPageUrl("DailyInfo")}
                delay={0.4}
              />
            )}
            
            {todayTasks.length > 0 && (
              <FocusCard
                title="Mai feladatok"
                value={todayTasks.length}
                subtitle={todayTasks[0]?.title || ""}
                icon={CheckCircle2}
                gradient="from-blue-500 to-cyan-500"
                linkTo={createPageUrl("DailyInfo")}
                delay={0.5}
              />
            )}

            {openMissingProducts > 0 && (
              <FocusCard
                title="Hiánycikk"
                value={openMissingProducts}
                subtitle="Nyitott termék"
                icon={PackageX}
                gradient="from-amber-500 to-orange-500"
                linkTo={createPageUrl("MissingProducts")}
                delay={0.6}
              />
            )}

            <FocusCard
              title="Elosztások"
              value={`${checkedDistributions}/${totalDistributions}`}
              subtitle="Ellenőrizve"
              icon={Truck}
              gradient="from-emerald-500 to-teal-500"
              linkTo={createPageUrl("Distributions")}
              delay={0.7}
            />

            <FocusCard
              title="NF visszaküldés"
              value={returnItems.length}
              subtitle="Rögzített tétel"
              icon={RotateCcw}
              gradient="from-purple-500 to-pink-500"
              linkTo={createPageUrl("Returns")}
              delay={0.8}
            />
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="space-y-3">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-lg font-bold text-slate-900 dark:text-white px-2"
          >
            Gyors műveletek
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <QuickActionButton
              icon={FileText}
              label="Napi Infó"
              linkTo={createPageUrl("DailyInfo")}
              gradient="from-yellow-500 to-orange-500"
              delay={1.0}
            />
            <QuickActionButton
              icon={CalendarDays}
              label="Heti Infó"
              linkTo={createPageUrl("WeeklyInfo")}
              gradient="from-indigo-500 to-purple-500"
              delay={1.1}
            />
            <QuickActionButton
              icon={Zap}
              label="Azonnali Infó"
              linkTo={createPageUrl("InstantInfo")}
              gradient="from-red-500 to-pink-500"
              delay={1.2}
            />
            <QuickActionButton
              icon={Package}
              label="Elosztások"
              linkTo={createPageUrl("Distributions")}
              gradient="from-blue-500 to-cyan-500"
              delay={1.3}
            />
            <QuickActionButton
              icon={RotateCcw}
              label="Visszaküldés"
              linkTo={createPageUrl("Returns")}
              gradient="from-purple-500 to-pink-500"
              delay={1.4}
            />
            <QuickActionButton
              icon={PackageX}
              label="Hiánycikk"
              linkTo={createPageUrl("MissingProducts")}
              gradient="from-orange-500 to-red-500"
              delay={1.5}
            />
          </div>
        </div>

        {/* Detailed Overview (Accordion) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white px-2">
            Részletes áttekintés
          </h2>
          
          <Accordion type="multiple" className="space-y-3">
            {/* Latest Daily Infos */}
            <AccordionItem value="daily" className="border-none">
              <Card className="shadow-lg border-2 border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Legutóbbi Napi Infók</span>
                    <Badge variant="secondary" className="ml-auto mr-4">
                      {allDailyInfos.slice(0, 5).length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-2 pt-2">
                    {allDailyInfos.slice(0, 5).map((info) => (
                      <Link
                        key={info.id}
                        to={`${createPageUrl("DailyInfo")}?date=${info.date}&taskId=${info.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {info.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(safeParseDate(info.date) || new Date(), 'yyyy. MMM d.', { locale: hu })}
                          </p>
                        </div>
                        {info.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-400" />
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Distribution History */}
            <AccordionItem value="distributions" className="border-none">
              <Card className="shadow-lg border-2 border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Elosztás előzmények</span>
                    <Badge variant="secondary" className="ml-auto mr-4">
                      {distributions.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-2 pt-2">
                    {distributions.slice(0, 5).map((dist) => (
                      <Link
                        key={dist.id}
                        to={createPageUrl("Distributions")}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {dist.product_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {dist.delivery_note_number} • {format(safeParseDate(dist.date) || new Date(), 'MMM d.', { locale: hu })}
                          </p>
                        </div>
                        {dist.status === 'ok' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : dist.status === 'discrepancy' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-400" />
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Weekly Infos */}
            <AccordionItem value="weekly" className="border-none">
              <Card className="shadow-lg border-2 border-slate-200 dark:border-slate-700">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                      <CalendarDays className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Heti Infók</span>
                    <Badge variant="secondary" className="ml-auto mr-4">
                      {weeklyInfos.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-2 pt-2">
                    {weeklyInfos.map((info) => (
                      <Link
                        key={info.id}
                        to={createPageUrl("WeeklyInfo")}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                            {info.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {info.week_number}. hét
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </motion.div>

      </div>
    </div>
  );
}