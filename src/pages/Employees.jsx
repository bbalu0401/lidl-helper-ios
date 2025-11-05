
import React, { useState } from "react";
import { supabaseClient } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { Users, Plus, Pencil, Trash2, UserCheck, UserX, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import ImagePreprocessor from "../components/schedule/ImagePreprocessor";

const ROLES = {
  uzletvezeto: { label: "Üzletvezető", color: "from-purple-500 to-purple-600", order: 1 },
  "1_uzletvezeto_helyettes": { label: "1. Üzletvezető helyettes", color: "from-blue-500 to-blue-600", order: 2 },
  "2_uzletvezeto_helyettes": { label: "2. Üzletvezető helyettes", color: "from-cyan-500 to-cyan-600", order: 3 },
  bolti_dolgozo: { label: "Bolti dolgozó", color: "from-green-500 to-green-600", order: 4 }
};

// Szerepkör fordító magyar → angol
const translateRole = (hungarianRole) => {
  const normalized = hungarianRole.toLowerCase().trim();
  
  if (normalized.includes('üzletvezető') && !normalized.includes('helyettes')) {
    return 'uzletvezeto';
  }
  if (normalized.includes('1.') && normalized.includes('helyettes')) {
    return '1_uzletvezeto_helyettes';
  }
  if (normalized.includes('2.') && normalized.includes('helyettes')) {
    return '2_uzletvezeto_helyettes';
  }
  if (normalized.includes('bolti dolgozó')) {
    return 'bolti_dolgozo';
  }
  
  return 'bolti_dolgozo'; // alapértelmezett
};

export default function Employees() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: 'bolti_dolgozo' });
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [preprocessedFile, setPreprocessedFile] = useState(null);

  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => supabaseClient.entities.Employee.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsCreateOpen(false);
      setFormData({ name: '', role: 'bolti_dolgozo' });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => supabaseClient.entities.Employee.bulkCreate(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsImportOpen(false);
      setPreprocessedFile(null);
      setIsProcessingOCR(false);
      alert(`✅ ${data.length} munkavállaló sikeresen importálva!`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabaseClient.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingEmployee(null);
      setFormData({ name: '', role: 'bolti_dolgozo' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabaseClient.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleCreate = () => {
    if (formData.name.trim()) {
      createMutation.mutate({ ...formData, active: true });
    }
  };

  const handleUpdate = () => {
    if (editingEmployee && formData.name.trim()) {
      updateMutation.mutate({
        id: editingEmployee.id,
        data: formData
      });
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({ name: employee.name, role: employee.role });
  };

  const toggleActive = (employee) => {
    updateMutation.mutate({
      id: employee.id,
      data: { active: !employee.active }
    });
  };

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
DAYFORCE MUNKAVÁLLALÓK LISTA BEOLVASÁSA

A képen egy mobilos lista látható SZEKCIÓKBAN CSOPORTOSÍTVA.

SZERKEZET:
- SZEKCIÓ CÍMEK: "1. Üzletvezető", "2. Üzletvezető" stb. (sötét háttérrel, óra ikonnal)
- ALATTUK: A munkavállalók neve (pl. "Fehér, Zsuzsanna", "Friedl, Bence")
- A NÉV ALATT: A részletes szerepkör (pl. "2.Üzletvezető helyettes")

MINDEN MUNKAVÁLLALÓ KÁRTYÁT OLVASD BE:
- Vedd a nevet a nagy fehér szövegből
- Vedd a szerepkört az alatta lévő kisebb kék/világosabb szövegből

NE a szekció címeket olvasd be munkavállalóként, csak az egyedi személyeket!
`,
              items: {
                type: "object",
                properties: {
                  name: { 
                    type: "string",
                    description: "A munkavállaló teljes neve PONTOSAN (pl. 'Fehér, Zsuzsanna', 'Takács, Hajnal Ágnes')"
                  },
                  role: { 
                    type: "string",
                    description: "A szerepkör a név alatt (pl. '2.Üzletvezető helyettes', 'Bolti dolgozó')"
                  }
                },
                required: ["name", "role"]
              }
            }
          },
          required: ["employees"]
        }
      });

      if (result.status === 'success' && result.output?.employees) {
        const existingNames = new Set(employees.map(e => e.name.toLowerCase()));
        
        const newEmployees = result.output.employees
          .filter(emp => !existingNames.has(emp.name.toLowerCase()))
          .map(emp => ({
            name: emp.name,
            role: translateRole(emp.role),
            active: true
          }));

        if (newEmployees.length > 0) {
          bulkCreateMutation.mutate(newEmployees);
        } else {
          alert('ℹ️ Minden munkavállaló már létezik az adatbázisban!');
          setIsImportOpen(false);
          setPreprocessedFile(null);
          setIsProcessingOCR(false);
        }
      } else {
        alert('⚠️ Nem sikerült beolvasni a munkavállalókat. Próbáld újra!');
        setIsProcessingOCR(false);
      }
    } catch (error) {
      console.error('OCR hiba:', error);
      alert('❌ Hiba történt az OCR során. Próbáld újra!');
      setIsProcessingOCR(false);
    }
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    const roleOrderA = ROLES[a.role]?.order || 999;
    const roleOrderB = ROLES[b.role]?.order || 999;
    
    if (roleOrderA !== roleOrderB) {
      return roleOrderA - roleOrderB;
    }
    
    return a.name.localeCompare(b.name, 'hu');
  });

  const activeEmployees = sortedEmployees.filter(e => e.active);
  const inactiveEmployees = sortedEmployees.filter(e => !e.active);

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
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Munkavállalók</h1>
              <p className="text-muted-foreground">Bolt dolgozóinak kezelése</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={isImportOpen} onOpenChange={(open) => {
              setIsImportOpen(open);
              if (!open) {
                setPreprocessedFile(null);
                setIsProcessingOCR(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-2">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Dayforce
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Munkavállalók importálása Dayforce-ból</DialogTitle>
                  <DialogDescription>
                    Készíts képernyőfotót a Dayforce "Munkavállalók" listájáról, és töltsd fel ide.
                  </DialogDescription>
                </DialogHeader>

                {!preprocessedFile ? (
                  <ImagePreprocessor
                    onProcessed={handleImageProcessed}
                    title="Dayforce munkavállalók lista képe"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-green-600 font-semibold mb-2">✓ Kép javítva és készen áll</p>
                      <img
                        src={URL.createObjectURL(preprocessedFile)}
                        alt="Preview"
                        className="max-w-full h-auto rounded-lg border-2 mx-auto"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setPreprocessedFile(null)}
                        className="flex-1"
                        disabled={isProcessingOCR}
                      >
                        Másik kép
                      </Button>
                      <Button
                        onClick={handleStartOCR}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
                        disabled={isProcessingOCR}
                      >
                        {isProcessingOCR ? 'OCR...' : 'Munkavállalók beolvasása'}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Új munkavállaló
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Új munkavállaló hozzáadása</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Teljes név *</Label>
                    <Input
                      id="name"
                      placeholder="pl. Kovács János"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Szerepkör *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({...formData, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLES).map(([key, role]) => (
                          <SelectItem key={key} value={key}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Mégse
                  </Button>
                  <Button onClick={handleCreate} disabled={!formData.name.trim()}>
                    Hozzáadás
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {activeEmployees.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Aktív munkavállalók ({activeEmployees.length})
              </h2>
              <div className="space-y-3">
                {activeEmployees.map((employee) => (
                  <Card key={employee.id} className="shadow-sm border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ROLES[employee.role].color} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                          {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-base">
                            {employee.name}
                          </h3>
                          <Badge className={`bg-gradient-to-r ${ROLES[employee.role].color} text-white text-xs mt-1`}>
                            {ROLES[employee.role].label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Dialog open={editingEmployee?.id === employee.id} onOpenChange={(open) => !open && setEditingEmployee(null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Munkavállaló szerkesztése</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-name">Teljes név *</Label>
                                  <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-role">Szerepkör *</Label>
                                  <Select
                                    value={formData.role}
                                    onValueChange={(value) => setFormData({...formData, role: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(ROLES).map(([key, role]) => (
                                        <SelectItem key={key} value={key}>{role.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingEmployee(null)}>
                                  Mégse
                                </Button>
                                <Button onClick={handleUpdate} disabled={!formData.name.trim()}>
                                  Mentés
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(employee)}
                            title="Inaktiválás"
                          >
                            <UserX className="w-4 h-4 text-muted-foreground" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Munkavállaló törlése</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Biztosan törölni szeretnéd {employee.name} adatait? Ez véglegesen törli az összes beosztását is!
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Mégse</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(employee.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Törlés
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {inactiveEmployees.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                <UserX className="w-5 h-5" />
                Inaktív munkavállalók ({inactiveEmployees.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {inactiveEmployees.map((employee) => (
                  <Card key={employee.id} className="shadow-sm border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                          {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-base">
                            {employee.name}
                          </h3>
                          <Badge variant="outline" className="text-xs mt-1">
                            {ROLES[employee.role].label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(employee)}
                            title="Aktiválás"
                          >
                            <UserCheck className="w-4 h-4 text-green-600" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Munkavállaló törlése</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Biztosan törölni szeretnéd {employee.name} adatait?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Mégse</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(employee.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Törlés
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {employees.length === 0 && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 px-6 border-2 border-dashed rounded-xl"
            >
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-muted-foreground">Még nincsenek munkavállalók</h3>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Importálj a Dayforce-ból, vagy add hozzá manuálisan.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
