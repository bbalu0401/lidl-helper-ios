import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/api/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Trash2, Pencil, MoreVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = {
  uzletvezeto: { label: "Üzletvezető", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800" },
  "1_uzletvezeto_helyettes": { label: "1.Üzletvezető helyettes", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  "2_uzletvezeto_helyettes": { label: "2.Üzletvezető helyettes", color: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800" },
  bolti_dolgozo: { label: "Bolti dolgozó", color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700" }
};

const getStatusBadge = (status) => {
  const badges = {
    pihenonap: { label: 'Pihenőnap', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
    szabadsag: { label: 'Szabadság', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
    betegseg: { label: 'Betegség', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
    munkaszuneti_nap: { label: 'Munkaszüneti nap', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
    muszak: { label: 'Műszak', className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800' },
  };
  return badges[status] || badges.muszak;
};

const getInitials = (name) => {
  const parts = name.split(/[\s,]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
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

export default function ScheduleCard({ schedule }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editData, setEditData] = useState({
    shift_text: schedule.shift_text || '',
    status: schedule.status || 'muszak',
    num_breaks_taken: schedule.num_breaks_taken || 0
  });

  const queryClient = useQueryClient();
  const statusBadge = getStatusBadge(schedule.status);
  const initials = getInitials(schedule.employee_name);
  const roleData = ROLES[schedule.employee_role] || { label: "Munkavállaló", color: "bg-slate-50 text-slate-700 border-slate-200" };

  const maxBreaks = calculateBreaksFromNetDuration(schedule.net_shift_duration);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabaseClient.entities.Schedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules_all'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', schedule.date] });
      setIsEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => supabaseClient.entities.Schedule.delete(schedule.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules_all'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', schedule.date] });
    },
  });

  const handleEdit = () => {
    setEditData({
      shift_text: schedule.shift_text || '',
      status: schedule.status || 'muszak',
      num_breaks_taken: schedule.num_breaks_taken || 0
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    const timeMatch = editData.shift_text.match(/(\d{1,2}:\d{2})/);
    const start_time = timeMatch ? timeMatch[1] : null;

    updateMutation.mutate({
      id: schedule.id,
      data: {
        shift_text: editData.shift_text,
        status: editData.status,
        start_time: start_time,
        num_breaks_taken: editData.num_breaks_taken
      }
    });
  };

  const handleToggleBreak = (breakNumber) => {
    const currentBreaks = schedule.num_breaks_taken || 0;
    
    if (breakNumber === currentBreaks) {
      updateMutation.mutate({
        id: schedule.id,
        data: { num_breaks_taken: breakNumber - 1 }
      });
    } else {
      updateMutation.mutate({
        id: schedule.id,
        data: { num_breaks_taken: breakNumber }
      });
    }
  };

  return (
    <Card className="border bg-card hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
            {initials}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {schedule.employee_name}
                </h3>
                <Badge variant="outline" className={`${roleData.color} text-xs mt-1 border`}>
                  {roleData.label}
                </Badge>
              </div>

              {/* Mobile menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Szerkesztés
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Törlés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {schedule.status === 'muszak' ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground">
                    {schedule.shift_text}
                  </span>
                </div>
                
                {maxBreaks > 0 && (
                  <div className="flex items-center gap-3">
                    {[...Array(maxBreaks)].map((_, index) => {
                      const breakNumber = index + 1;
                      const isChecked = (schedule.num_breaks_taken || 0) >= breakNumber;
                      
                      return (
                        <div key={breakNumber} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`break-${schedule.id}-${breakNumber}`}
                            checked={isChecked}
                            onCheckedChange={() => handleToggleBreak(breakNumber)}
                            disabled={updateMutation.isPending}
                          />
                          <label
                            htmlFor={`break-${schedule.id}-${breakNumber}`}
                            className="text-xs text-muted-foreground cursor-pointer select-none"
                          >
                            {breakNumber}. szünet
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="outline" className={`${statusBadge.className} border`}>
                {statusBadge.label}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Beosztás szerkesztése</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Munkavállaló</Label>
              <Input value={schedule.employee_name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift_text">Műszak szöveg</Label>
              <Input
                id="shift_text"
                value={editData.shift_text}
                onChange={(e) => setEditData({ ...editData, shift_text: e.target.value })}
                placeholder="pl. 10:00-19:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Státusz</Label>
              <Select
                value={editData.status}
                onValueChange={(value) => setEditData({ ...editData, status: value })}
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
            {editData.status === 'muszak' && (
              <div className="space-y-2">
                <Label htmlFor="num_breaks">Szünetek száma</Label>
                <Select
                  value={editData.num_breaks_taken.toString()}
                  onValueChange={(value) => setEditData({ ...editData, num_breaks_taken: parseInt(value, 10) })}
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beosztás törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretnéd {schedule.employee_name} beosztását erre a napra?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}