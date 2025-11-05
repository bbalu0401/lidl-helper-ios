
import React, { useState } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
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
import { Users, Calendar, AlertTriangle, Plus, Loader2, Save, X as XIcon, Trash2, UserPlus } from "lucide-react";
import { format, getWeek, startOfWeek, addDays, subDays } from "date-fns";
import { hu } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import ScheduleCard from "../components/schedule/ScheduleCard";
import HorizontalDatepicker from '../components/daily_info/HorizontalDatepicker';
import ImagePreprocessor from '../components/schedule/ImagePreprocessor';

const ROLES = {
  uzletvezeto: { label: "Üzletvezető", order: 1 },
  "1_uzletvezeto_helyettes": { label: "1.Üzletvezető helyettes", order: 2 },
  "2_uzletvezeto_helyettes": { label: "2.Üzletvezető helyettes", order: 3 },
  bolti_dolgozo: { label: "Bolti dolgozó", order: 4 }
};

const STATUS_ORDER = {
  muszak: 1,
  pihenonap: 2,
  szabadsag: 3,
  betegseg: 4,
  munkaszuneti_nap: 5
};

const calculateBreaksFromNetDuration = (netDuration) => {
  if (!netDuration) return 0;
  
  const parts = netDuration.split(':');
  if (parts.length !== 2) return 0;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return 0;
  
  const totalMinutes = hours * 60 + minutes;
  
  if (totalMinutes < 360) return 0;
  if (totalMinutes >= 360 && totalMinutes < 540) return 1;
  if (totalMinutes >= 540) return 2;
  
  return 0;
};

const getShiftType = (startTime) => {
  if (!startTime) return 4;
  
  const [hour] = startTime.split(':').map(Number);
  
  if (hour >= 5 && hour < 12) return 1;
  if (hour >= 12 && hour < 17) return 2;
  if (hour >= 17 && hour < 21) return 3;
  return 4;
};

const timeToMinutes = (timeString) => {
  if (!timeString) return 9999;
  const [hour, minute] = timeString.split(':').map(Number);
  return hour * 60 + minute;
};

const similarity = (s1, s2) => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = (s1, s2) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [preprocessedFile, setPreprocessedFile] = useState(null);
  const [newShift, setNewShift] = useState({
    employee_id: '',
    employee_name_manual: '',
    shift_text: '',
    status: 'muszak',
    num_breaks_taken: 0
  });
  
  const queryClient = useQueryClient();

  const currentWeek = getWeek(selectedDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');

  const { data: allSchedules } = useQuery({
    queryKey: ['schedules_all'],
    queryFn: () => supabaseClient.entities.Schedule.list('-date'),
    initialData: [],
  });

  const { data: schedulesToday } = useQuery({
    queryKey: ['schedules', selectedDateKey],
    queryFn: () => supabaseClient.entities.Schedule.filter({ date: selectedDateKey }),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => supabaseClient.entities.Employee.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.Schedule.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules_all'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', selectedDateKey] });
      setIsUploadOpen(false);
      setPreprocessedFile(null);
      setIsProcessingOCR(false);
    },
  });

  const createSingleMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.Schedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules_all'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', selectedDateKey] });
      setIsAddShiftOpen(false);
      setNewShift({
        employee_id: '',
        employee_name_manual: '',
        shift_text: '',
        status: 'muszak',
        num_breaks_taken: 0
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const all = await supabaseClient.entities.Schedule.list();
      const deletePromises = all.map(s => supabaseClient.entities.Schedule.delete(s.id));
      await Promise.all(deletePromises);
      return all.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['schedules_all'] });
      alert(`✅ ${count} beosztás törölve!`);
    }
  });

  const handleImageProcessed = (processedFile) => {
    setPreprocessedFile(processedFile);
  };

  const handleStartOCR = async () => {
    if (!preprocessedFile) return;

    setIsProcessingOCR(true);

    try {
      const { file_url } = await supabaseClient.integrations.Core.UploadFile({ file: preprocessedFile });

      const result = await supabaseClient.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            employees: {
              type: "array",
              description: `
DAYFORCE BEOSZTÁS - MŰSZAK IDŐPONTOK ÉS NETTÓ MUNKAIDŐ KIOLVASÁSA

TÁBLÁZAT SZERKEZET:
- BAL SZÉLSŐ OSZLOP = Munkavállalók nevei
- FELSŐ SOR = 7 NAP OSZLOPAI (Hétfő, Kedd, Szerda, Csütörtök, Péntek, Szombat, Vasárnap)
- VASTAG FÜGGŐLEGES VONALAK = Napok közötti határok

FONTOS - NAPOK ELVÁLASZTÁSA:
→ Minden NAP külön OSZLOP!
→ A VASTAG VONALAK elválasztják az oszlopokat
→ NE olvasd át az adatokat egyik napból a másikba!
→ CSAK az adott oszlopban lévő információt használd!

MINDEN CELLÁBAN TÖBB IDŐPONT IS VAN, ÉS EGY NETTÓ MUNKAIDŐ:

1. VASTAG BETŰS MŰSZAK IDŐ: pl. "10:00-19:00" (ezt mindig olvasd ki)
2. MELLETTE VAGY ALATTA KISEBB SZÁMOK: pl. "8:30" vagy "9:15" - EZ A NETTÓ MUNKAIDŐ!
   → Ez általában óraszám formátumban van (pl. "8:30" = 8 óra 30 perc nettó munkaidő)
   → Ez lehet közvetlenül a műszak idő mellett vagy alatta
3. ALATTA tevékenységek (pl. "Vezető: 10:00-19:00", "SZ:13:00-13:30") - EZEK NEM KELLENEK!

PÉLDÁK NAPOKRA LEBONTVA:
HÉTFŐ oszlopban: 
  "10:00-19:00 8:30" → shift_time: "10:00-19:00", net_duration: "8:30"
KEDD oszlopban: 
  "13:45-22:45
   9:15" → shift_time: "13:45-22:45", net_duration: "9:15"

STÁTUSZOK:
- "P" (nagy szürke betű) → "P", net_duration: null
- "S" → "S", net_duration: null
- "Munkaszüneti nap" → "Munkaszüneti nap", net_duration: null
- ÜRES cella → "-", net_duration: null
- IDŐPONT (HH:MM-HH:MM) vastagon + nettó óraszám → shift_time és net_duration

RENDKÍVÜL FONTOS:
- Ha látod az időpontot ÉS a nettó óraszámot → az MŰSZAK a nettó idővel!
- Minden nap külön oszlop, ne olvasd át!
- Figyelj a vastag vonalakra!
- A nettó munkaidőt MINDIG próbáld megtalálni a műszak idő mellett/alatt!
`,
              items: {
                type: "object",
                properties: {
                  name: { 
                    type: "string",
                    description: "Név a bal oszlopból" 
                  },
                  monday: { type: "string", description: "HÉTFŐ - shift_time (időpont)" },
                  monday_net: { type: "string", description: "HÉTFŐ - nettó munkaidő (pl. '8:30')" },
                  tuesday: { type: "string", description: "KEDD - shift_time" },
                  tuesday_net: { type: "string", description: "KEDD - nettó munkaidő" },
                  wednesday: { type: "string", description: "SZERDA - shift_time" },
                  wednesday_net: { type: "string", description: "SZERDA - nettó munkaidő" },
                  thursday: { type: "string", description: "CSÜTÖRTÖK - shift_time" },
                  thursday_net: { type: "string", description: "CSÜTÖRTÖK - nettó munkaidő" },
                  friday: { type: "string", description: "PÉNTEK - shift_time" },
                  friday_net: { type: "string", description: "PÉNTEK - nettó munkaidő" },
                  saturday: { type: "string", description: "SZOMBAT - shift_time" },
                  saturday_net: { type: "string", description: "SZOMBAT - nettó munkaidő" },
                  sunday: { type: "string", description: "VASÁRNAP - shift_time" },
                  sunday_net: { type: "string", description: "VASÁRNAP - nettó munkaidő" }
                },
                required: ["name", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
              }
            }
          },
          required: ["employees"]
        }
      });

      if (result.status === 'success' && result.output?.employees) {
        const allSchedules = [];
        const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 1 });

        result.output.employees.forEach(empData => {
          let matchedEmployee = employees.find(e => 
            e.name.toLowerCase() === empData.name.toLowerCase()
          );

          if (!matchedEmployee && employees.length > 0) {
            let bestMatch = null;
            let bestScore = 0;

            employees.forEach(e => {
              const score = similarity(e.name, empData.name);
              if (score > bestScore && score > 0.7) {
                bestScore = score;
                bestMatch = e;
              }
            });

            matchedEmployee = bestMatch;
          }

          const employeeName = matchedEmployee?.name || empData.name;
          const employeeId = matchedEmployee?.id || `temp_${empData.name}`;
          const employeeRole = matchedEmployee?.role || 'bolti_dolgozo';

          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

          days.forEach((dayKey, index) => {
            const dayText = empData[dayKey];
            const netDuration = empData[`${dayKey}_net`];
            
            if (!dayText || dayText === '-') return;

            const currentDate = format(addDays(weekStartDate, index), 'yyyy-MM-dd');

            let status = 'muszak';
            let shift_text = dayText;
            let start_time = null;
            let net_shift_duration = netDuration || null;

            const trimmedText = dayText.trim();
            
            if (trimmedText === 'P') {
              status = 'pihenonap';
              shift_text = 'Pihenőnap';
              net_shift_duration = null;
            } else if (trimmedText === 'S') {
              status = 'szabadsag';
              shift_text = 'Szabadság';
              net_shift_duration = null;
            } else if (trimmedText.toLowerCase().includes('munkaszüneti')) {
              status = 'munkaszuneti_nap';
              shift_text = 'Munkaszüneti nap';
              net_shift_duration = null;
            } else if (trimmedText.toLowerCase().includes('táppénz') || trimmedText.toLowerCase().includes('beteg')) {
              status = 'betegseg';
              shift_text = 'Betegség';
              net_shift_duration = null;
            } else {
              const timeMatch = dayText.match(/(\d{1,2}:\d{2})/);
              if (timeMatch) {
                status = 'muszak';
                start_time = timeMatch[1];
              } else {
                if (trimmedText.toLowerCase().includes('szabadság')) {
                  status = 'szabadsag';
                  shift_text = 'Szabadság';
                  net_shift_duration = null;
                } else if (trimmedText.toLowerCase().includes('pihenő')) {
                  status = 'pihenonap';
                  shift_text = 'Pihenőnap';
                  net_shift_duration = null;
                }
              }
            }

            allSchedules.push({
              week_number: getWeek(new Date(currentDate), { weekStartsOn: 1, firstWeekContainsDate: 4 }),
              date: currentDate,
              employee_id: employeeId,
              employee_name: employeeName,
              employee_role: employeeRole,
              shift_text: shift_text,
              net_shift_duration: net_shift_duration,
              start_time: start_time,
              status: status,
              num_breaks_taken: 0
            });
          });
        });

        if (allSchedules.length > 0) {
          createMutation.mutate(allSchedules);
        } else {
          alert('⚠️ Nem sikerült beolvasni a beosztást. Nincs feldolgozható adat. Próbáld újra!');
          setIsProcessingOCR(false);
        }
      } else {
        alert('⚠️ Nem sikerült beolvasni a beosztást. Próbáld újra!');
        setIsProcessingOCR(false);
      }
    } catch (error) {
      console.error('OCR hiba:', error);
      alert('❌ Hiba történt az OCR során. Próbáld újra!');
      setIsProcessingOCR(false);
    }
  };

  const handleSwipe = (direction) => {
    if (direction === 'left') {
      setSwipeDirection(-1);
      setTimeout(() => {
        setSelectedDate(addDays(selectedDate, 1));
        setSwipeDirection(0);
      }, 200);
    } else if (direction === 'right') {
      setSwipeDirection(1);
      setTimeout(() => {
        setSelectedDate(subDays(selectedDate, 1));
        setSwipeDirection(0);
      }, 200);
    }
  };

  const handleAddShift = () => {
    let employeeName = '';
    let employeeId = '';
    let employeeRole = 'bolti_dolgozo';

    if (newShift.employee_id === 'manual') {
      if (!newShift.employee_name_manual.trim()) return;
      employeeName = newShift.employee_name_manual.trim();
      employeeId = `temp_${Date.now()}`;
    } else {
      const selectedEmployee = employees.find(e => e.id === newShift.employee_id);
      if (!selectedEmployee) return;
      employeeName = selectedEmployee.name;
      employeeId = selectedEmployee.id;
      employeeRole = selectedEmployee.role;
    }

    const timeMatch = newShift.shift_text.match(/(\d{1,2}:\d{2})/);
    const start_time = timeMatch ? timeMatch[1] : null;

    createSingleMutation.mutate({
      week_number: currentWeek,
      date: selectedDateKey,
      employee_id: employeeId,
      employee_name: employeeName,
      employee_role: employeeRole,
      shift_text: newShift.shift_text,
      net_shift_duration: null,
      start_time: start_time,
      status: newShift.status,
      num_breaks_taken: newShift.num_breaks_taken
    });
  };

  const sortedSchedules = [...schedulesToday].sort((a, b) => {
    const statusOrderA = STATUS_ORDER[a.status] || 999;
    const statusOrderB = STATUS_ORDER[b.status] || 999;

    if (statusOrderA !== statusOrderB) {
      return statusOrderA - statusOrderB;
    }

    if (a.status === 'muszak' && b.status === 'muszak') {
      const timeA = timeToMinutes(a.start_time);
      const timeB = timeToMinutes(b.start_time);
      
      if (timeA !== timeB) {
        return timeA - timeB;
      }
    }

    const roleOrderA = ROLES[a.employee_role]?.order || 999;
    const roleOrderB = ROLES[b.employee_role]?.order || 999;

    if (roleOrderA !== roleOrderB) {
      return roleOrderA - roleOrderB;
    }

    return 0;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Beosztás</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(selectedDate, 'yyyy. MMMM d., EEEE', { locale: hu })}
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {allSchedules.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                    Összes törlése
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>MINDEN beosztás törlése</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ez törli az ÖSSZES ({allSchedules.length} db) beosztást! Ez a művelet NEM vonható vissza!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllMutation.mutate()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Törlés
                    </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
              </AlertDialog>
            )}

            <Dialog open={isUploadOpen} onOpenChange={(open) => {
              setIsUploadOpen(open);
              if (!open) {
                setPreprocessedFile(null);
                setIsProcessingOCR(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 sm:flex-none">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Feltöltés
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Heti beosztás feltöltése</DialogTitle>
                  <DialogDescription>
                    Tölts fel egy Dayforce képernyőfotót. A beosztás automatikusan feldolgozásra kerül.
                  </DialogDescription>
                </DialogHeader>

                {!preprocessedFile ? (
                  <ImagePreprocessor
                    onProcessed={handleImageProcessed}
                    title="Dayforce képernyőfotó"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-green-600 font-medium mb-2">✓ Kép előkészítve</p>
                      <img
                        src={URL.createObjectURL(preprocessedFile)}
                        alt="Preview"
                        className="max-w-full h-auto rounded-lg border mx-auto"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setPreprocessedFile(null)}
                        className="flex-1"
                        disabled={isProcessingOCR || createMutation.isPending}
                        size="sm"
                      >
                        Másik kép
                      </Button>
                      <Button
                        onClick={handleStartOCR}
                        className="flex-1"
                        disabled={isProcessingOCR || createMutation.isPending}
                        size="sm"
                      >
                        {isProcessingOCR || createMutation.isPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            OCR és mentés...
                          </>
                        ) : (
                          'Beolvasás és mentés'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Date picker and add button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden">
            <HorizontalDatepicker
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              allDailyInfos={allSchedules.map(s => ({ date: s.date, completed: true }))}
            />
          </div>
          
          <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <UserPlus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Műszak hozzáadása</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Munkavállaló *</Label>
                  <Select
                    value={newShift.employee_id}
                    onValueChange={(value) => setNewShift({...newShift, employee_id: value, employee_name_manual: ''})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Dolgozók</SelectLabel>
                        {employees.filter(e => e.active).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Egyéb</SelectLabel>
                        <SelectItem value="manual">➕ Diák / Egyéb</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {newShift.employee_id === 'manual' && (
                  <div className="space-y-2">
                    <Label>Név *</Label>
                    <Input
                      placeholder="pl. Kovács Anna"
                      value={newShift.employee_name_manual}
                      onChange={(e) => setNewShift({...newShift, employee_name_manual: e.target.value})}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Státusz</Label>
                  <Select
                    value={newShift.status}
                    onValueChange={(value) => setNewShift({...newShift, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muszak">Műszak</SelectItem>
                      <SelectItem value="pihenonap">Pihenőnap</SelectItem>
                      <SelectItem value="szabadsag">Szabadság</SelectItem>
                      <SelectItem value="betegseg">Betegség</SelectItem>
                      <SelectItem value="munkaszuneti_nap">Munkaszüneti nap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newShift.status === 'muszak' && (
                  <>
                    <div className="space-y-2">
                      <Label>Műszak idő *</Label>
                      <Input
                        placeholder="pl. 10:00-19:00"
                        value={newShift.shift_text}
                        onChange={(e) => setNewShift({...newShift, shift_text: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Szünetek száma</Label>
                      <Select
                        value={newShift.num_breaks_taken.toString()}
                        onValueChange={(value) => setNewShift({...newShift, num_breaks_taken: parseInt(value, 10)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Nincs szünet</SelectItem>
                          <SelectItem value="1">1 szünet</SelectItem>
                          <SelectItem value="2">2 szünet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddShiftOpen(false)} size="sm">
                  Mégse
                </Button>
                <Button 
                  onClick={handleAddShift} 
                  disabled={
                    (newShift.employee_id === 'manual' && !newShift.employee_name_manual.trim()) ||
                    (newShift.employee_id !== 'manual' && !newShift.employee_id) ||
                    (newShift.status === 'muszak' && !newShift.shift_text)
                  }
                  size="sm"
                >
                  Hozzáadás
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Schedule list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDateKey}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            dragMomentum={false}
            onDragEnd={(event, info) => {
              const swipeThreshold = 80;
              const velocity = Math.abs(info.velocity.x);

              if (info.offset.x > swipeThreshold || (info.offset.x > 30 && velocity > 500)) {
                handleSwipe('right');
              } else if (info.offset.x < -swipeThreshold || (info.offset.x < -30 && velocity > 500)) {
                handleSwipe('left');
              }
            }}
            initial={{ opacity: 0, x: swipeDirection === -1 ? 50 : swipeDirection === 1 ? -50 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDirection === -1 ? -50 : swipeDirection === 1 ? 50 : 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="space-y-2"
          >
            {sortedSchedules.length > 0 ? (
              sortedSchedules.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-muted-foreground mb-1">
                  Nincs beosztás
                </h3>
                <p className="text-sm text-muted-foreground/80">
                  Tölts fel egy beosztást, vagy add hozzá manuálisan.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
