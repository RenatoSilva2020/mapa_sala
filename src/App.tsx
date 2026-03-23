/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, TouchSensor, closestCenter, DragOverlay } from '@dnd-kit/core';
import { Trash2, Users, Loader2, Edit, Plus, Download, Menu, X, DoorOpen, Monitor, Lock, Unlock, Save, History, LogOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ClassroomMap } from './components/ClassroomMap';
import { Sidebar } from './components/Sidebar';
import { ClassData, StudentData, HistoryEntry } from './types';
import { StudentCard } from './components/StudentCard';

const API_URL = import.meta.env.VITE_API_URL || "/api/data";
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbwBR0A-QOWfJdgiKjHdSXJavFgcJmMHpVOWbVKBqBZXtW3tkturTg9nx-srSQGqsTSY/exec";

export default function App() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  
  // Class Modal State
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassRows, setNewClassRows] = useState(6);
  const [newClassCols, setNewClassCols] = useState(6);
  const [newDoorPosition, setNewDoorPosition] = useState<'left' | 'right'>('right');
  const [newDeskPosition, setNewDeskPosition] = useState<'left' | 'right'>('left');

  // Student Modal State
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Alert Modal State
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Save Map Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [saveActionType, setSaveActionType] = useState<'save' | 'unlock'>('save');

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSystemClosed, setIsSystemClosed] = useState(false);

  // Warning for unsaved changes (Browser Tab Close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setApiError(null);
      console.log(`[API] Buscando dados de: ${API_URL}`);
      
      try {
        // Adiciona timestamp para evitar cache em navegadores mobile
        const fetchUrl = API_URL.startsWith('http') 
          ? `${API_URL}${API_URL.includes('?') ? '&' : '?'}t=${Date.now()}`
          : API_URL;

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const data = await response.json();
        console.log('[API] Dados recebidos com sucesso');

        const formattedStudents = (data.estudantes || []).map((s: any) => {
          let seatId = null;
          if (s.row && s.col && s.row !== "(vazio)" && s.col !== "(vazio)") {
            const r = parseInt(s.row, 10);
            const c = parseInt(s.col, 10);
            if (!isNaN(r) && !isNaN(c)) {
              seatId = `seat-${r - 1}-${c - 1}`;
            }
          }
          return {
            id: s.id,
            name: s.name,
            classId: s.classId,
            seatId
          };
        });

        const formattedClasses = (data.turmas || []).map((t: any) => {
          // Auto-lock if there are seated students in this class
          const hasSeatedStudents = formattedStudents.some(s => s.classId === t.id && s.seatId !== null);
          
          // Filter history for this class if history comes as a separate array
          const classHistory = (data.historico || [])
            .filter((h: any) => h.classId === t.id)
            .map((h: any) => ({
              id: h.id,
              date: h.date,
              teacherName: h.teacherName,
              action: h.action
            }));

          return {
            id: t.id,
            name: t.name,
            rows: t.rows || 6,
            cols: t.cols || 6,
            doorPosition: t.doorPosition || 'right',
            deskPosition: t.deskPosition || 'left',
            isLocked: hasSeatedStudents ? true : (t.isLocked || false),
            lastUpdated: t.lastUpdated || null,
            history: classHistory.length > 0 ? classHistory : (t.history || [])
          };
        });
        setClasses(formattedClasses);
        setStudents(formattedStudents);
        
        if (data.turmas && data.turmas.length > 0) {
          setSelectedClassId(data.turmas[0].id);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setApiError("Não foi possível carregar os dados da planilha. Verifique a conexão ou a URL do script.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Refs para acessar o estado atual dentro do listener de popstate sem recriar o efeito
  const isDirtyRef = useRef(isDirty);
  const isSystemClosedRef = useRef(isSystemClosed);

  useEffect(() => {
    isDirtyRef.current = isDirty;
    isSystemClosedRef.current = isSystemClosed;
  }, [isDirty, isSystemClosed]);

  // Intercepta o botão voltar do navegador/mobile e o fechamento da aba
  useEffect(() => {
    // Para desktop: avisa sobre alterações não salvas ao fechar a aba
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // Para mobile: intercepta o botão voltar
    // Adicionamos uma entrada no histórico para que possamos capturar o evento popstate
    window.history.pushState({ noBackExits: true }, '');

    const handlePopState = () => {
      if (isSystemClosedRef.current) return;

      // Empurra de volta para manter o usuário na página
      window.history.pushState({ noBackExits: true }, '');

      // Aciona a lógica de saída
      if (isDirtyRef.current) {
        setConfirmModal({
          isOpen: true,
          title: 'Sair do Sistema',
          message: 'Existem alterações que não foram salvas. Deseja realmente sair e descartar as mudanças?',
          confirmLabel: 'Sair e Descartar',
          confirmColor: 'bg-orange-600 hover:bg-orange-700',
          onConfirm: () => {
            setIsDirty(false);
            setIsSystemClosed(true);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Sair do Sistema',
          message: 'Deseja realmente encerrar a sessão?',
          confirmLabel: 'Sair',
          confirmColor: 'bg-slate-800 hover:bg-slate-700',
          onConfirm: () => {
            setIsSystemClosed(true);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const sendPostRequest = async (action: string, payload: any) => {
    const body = JSON.stringify({ action, payload });
    const isExternal = API_URL.startsWith('http');
    console.log(`[API] Enviando ação "${action}" para ${isExternal ? 'Planilha' : 'Backend Local'}`);
    
    try {
      const options: RequestInit = {
        method: 'POST',
        body: body
      };

      if (isExternal) {
        // Usamos no-cors para evitar problemas de preflight com o Google Script
        // O dado será enviado, mas não poderemos ler a resposta (opaque response)
        options.mode = 'no-cors';
        options.headers = { 'Content-Type': 'text/plain' };
      } else {
        // Para o backend local, usamos application/json
        options.headers = { 'Content-Type': 'application/json' };
      }

      const response = await fetch(API_URL, options);
      console.log(`[API] Resposta da ação "${action}" enviada`);
      return response;
    } catch (error) {
      console.error(`[API] Erro na ação "${action}":`, error);
      setAlertModal({
        isOpen: true,
        title: 'Erro de Sincronização',
        message: 'Não foi possível salvar as alterações na planilha. Verifique sua conexão.'
      });
    }
  };

  const handleSaveMap = () => {
    if (!selectedClassId) return;
    
    // Verifica se há alunos não posicionados
    if (unseatedStudents.length > 0) {
      setAlertModal({
        isOpen: true,
        title: 'Atenção',
        message: `Não é possível salvar o mapa com ${unseatedStudents.length} aluno(s) fora das carteiras. Por favor, posicione todos os alunos antes de salvar.`
      });
      return;
    }

    setTeacherName('');
    setShowSaveModal(true);
  };

  const handleExitSystem = () => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: 'Sair do Sistema',
        message: 'Existem alterações que não foram salvas. Deseja realmente sair e descartar as mudanças?',
        confirmLabel: 'Sair e Descartar',
        confirmColor: 'bg-orange-600 hover:bg-orange-700',
        onConfirm: () => {
          setIsDirty(false);
          setIsSystemClosed(true);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setIsSystemClosed(true);
    }
  };

  const confirmSaveMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !selectedClassId) return;

    setIsSaving(true);
    try {
      const now = new Date();
      const lastUpdated = now.toISOString();
      const historyEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        date: lastUpdated,
        teacherName: teacherName.trim(),
        action: 'save'
      };

      // Coleta as posições de todos os alunos desta turma para salvar em massa
      const classStudents = students
        .filter(s => s.classId === selectedClassId)
        .map(s => {
          let row = null;
          let col = null;
          if (s.seatId) {
            const parts = s.seatId.split('-');
            row = parseInt(parts[1]) + 1;
            col = parseInt(parts[2]) + 1;
          }
          return { id: s.id, row, col };
        });
      
      setClasses(classes.map(c => 
        c.id === selectedClassId ? { 
          ...c, 
          isLocked: true, 
          lastUpdated,
          history: [...(c.history || []), historyEntry]
        } : c
      ));

      await sendPostRequest('saveMap', { 
        id: selectedClassId, 
        lastUpdated, 
        historyEntry,
        students: classStudents
      });
      
      setIsDirty(false);
      
      setAlertModal({
        isOpen: true,
        title: 'Mapa Salvo',
        message: 'O mapeamento foi salvo e travado com sucesso.'
      });
      
      setShowSaveModal(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setAlertModal({
        isOpen: true,
        title: 'Erro ao Salvar',
        message: 'Ocorreu um erro ao tentar salvar o mapa. Por favor, tente novamente.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlockMap = () => {
    if (!selectedClassId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Editar Mapa',
      message: 'Deseja realmente editar o mapa? Isso irá destravar as alterações.',
      confirmLabel: 'Editar',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Destrava diretamente sem pedir nome
        setClasses(classes.map(c => 
          c.id === selectedClassId ? { ...c, isLocked: false } : c
        ));
        sendPostRequest('unlockMap', { id: selectedClassId });
        setIsDirty(true); // Marca como "com alterações" ao destravar para editar
      }
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 10,
      },
    })
  );

  const openAddClassModal = () => {
    setEditingClassId(null);
    setNewClassName('');
    setNewClassRows(6);
    setNewClassCols(6);
    setNewDoorPosition('right');
    setNewDeskPosition('left');
    setShowClassModal(true);
  };

  const openEditClassModal = () => {
    const current = classes.find(c => c.id === selectedClassId);
    if (current) {
      setEditingClassId(current.id);
      setNewClassName(current.name);
      setNewClassRows(current.rows);
      setNewClassCols(current.cols);
      setNewDoorPosition(current.doorPosition || 'right');
      setNewDeskPosition(current.deskPosition || 'left');
      setShowClassModal(true);
    }
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      const rows = parseInt(newClassRows.toString()) || 1;
      const cols = parseInt(newClassCols.toString()) || 1;
      
      if (editingClassId) {
        const current = classes.find(c => c.id === editingClassId);
        const updatedClass = {
          ...current,
          id: editingClassId,
          name: newClassName.trim(),
          rows,
          cols,
          doorPosition: newDoorPosition,
          deskPosition: newDeskPosition
        };
        setClasses(classes.map(c => c.id === editingClassId ? updatedClass : c));
        sendPostRequest('editClass', updatedClass);
        setIsDirty(true);
      } else {
        const newClass = { 
          id: crypto.randomUUID(), 
          name: newClassName.trim(),
          rows,
          cols,
          doorPosition: newDoorPosition,
          deskPosition: newDeskPosition
        };
        setClasses([...classes, newClass]);
        setSelectedClassId(newClass.id);
        sendPostRequest('addClass', newClass);
        setIsDirty(true);
      }
      setShowClassModal(false);
    }
  };

  const requestDeleteClass = () => {
    if (!selectedClassId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Turma',
      message: 'Tem certeza que deseja excluir esta turma e todos os seus alunos? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        setClasses(classes.filter(c => c.id !== selectedClassId));
        setStudents(students.filter(s => s.classId !== selectedClassId));
        setSelectedClassId(classes.length > 1 ? classes.find(c => c.id !== selectedClassId)?.id || null : null);
        sendPostRequest('deleteClass', { id: selectedClassId });
        setIsDirty(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestAddStudent = () => {
    if (!selectedClassId) return;
    setNewStudentName('');
    setShowStudentModal(true);
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentName.trim() && selectedClassId) {
      const newStudent = {
        id: crypto.randomUUID(),
        classId: selectedClassId,
        name: newStudentName.trim(),
        seatId: null,
      };
      setStudents([...students, newStudent]);
      sendPostRequest('addStudent', { ...newStudent, row: null, col: null });
      setIsDirty(true);
      setShowStudentModal(false);
    }
  };

  const requestDeleteStudent = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aluno',
      message: 'Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        setStudents(students.filter(s => s.id !== id));
        sendPostRequest('deleteStudent', { id });
        setIsDirty(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const student = students.find(s => s.id === active.id);
    if (student) setActiveStudent(student);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStudent(null);
    const { active, over } = event;
    if (!over) return;

    const studentId = active.id as string;
    const overId = over.id as string;

    moveStudent(studentId, overId);
  };

  const moveStudent = (studentId: string, overId: string) => {
    setIsDirty(true);
    
    // 1. Primeiro atualizamos o estado local (UI)
    let studentToUpdate: StudentData | null = null;
    let occupiedStudentToUpdate: StudentData | null = null;
    let newRow: number | null = null;
    let newCol: number | null = null;
    let oldRow: number | null = null;
    let oldCol: number | null = null;

    setStudents((prev) => {
      const newStudents = [...prev];
      const studentIndex = newStudents.findIndex(s => s.id === studentId);
      if (studentIndex === -1) return prev;

      const student = newStudents[studentIndex];
      studentToUpdate = student;

      if (overId === 'sidebar') {
        newStudents[studentIndex] = { ...student, seatId: null };
        newRow = null;
        newCol = null;
      } else if (overId.startsWith('seat-')) {
        const occupiedIndex = newStudents.findIndex(s => s.seatId === overId && s.classId === student.classId);
        
        const [, rStr, cStr] = overId.split('-');
        newRow = parseInt(rStr) + 1;
        newCol = parseInt(cStr) + 1;

        if (occupiedIndex !== -1 && newStudents[occupiedIndex].id !== studentId) {
          // Swap
          const tempSeat = student.seatId;
          const occupiedStudent = newStudents[occupiedIndex];
          occupiedStudentToUpdate = occupiedStudent;
          
          newStudents[studentIndex] = { ...student, seatId: overId };
          newStudents[occupiedIndex] = { ...occupiedStudent, seatId: tempSeat };
          
          oldRow = tempSeat ? parseInt(tempSeat.split('-')[1]) + 1 : null;
          oldCol = tempSeat ? parseInt(tempSeat.split('-')[2]) + 1 : null;
        } else {
          newStudents[studentIndex] = { ...student, seatId: overId };
        }
      }
      return newStudents;
    });

    // 2. Depois enviamos a requisição para o servidor (fora do setStudents)
    if (overId === 'sidebar') {
      sendPostRequest('updateStudentSeat', { id: studentId, row: null, col: null });
    } else if (overId.startsWith('seat-')) {
      if (occupiedStudentToUpdate) {
        sendPostRequest('swapStudents', {
          student1: { id: studentId, row: newRow, col: newCol },
          student2: { id: (occupiedStudentToUpdate as StudentData).id, row: oldRow, col: oldCol }
        });
      } else {
        sendPostRequest('updateStudentSeat', { id: studentId, row: newRow, col: newCol });
      }
    }
  };

  const handleSelectStudent = (studentId: string) => {
    if (selectedSeatId) {
      // Move student to the selected seat
      moveStudent(studentId, selectedSeatId);
      setSelectedSeatId(null);
      setSelectedStudentId(null);
    } else if (selectedStudentId && selectedStudentId !== studentId) {
      // If a student is already selected, and we click another student
      // Check if the second student is on a seat
      const student2 = students.find(s => s.id === studentId);
      if (student2 && student2.seatId) {
        // Swap or move to that seat
        moveStudent(selectedStudentId, student2.seatId);
        setSelectedStudentId(null);
      } else {
        // Both in sidebar, just change selection
        setSelectedStudentId(studentId);
      }
    } else {
      setSelectedStudentId(selectedStudentId === studentId ? null : studentId);
      setSelectedSeatId(null);
      // Close sidebar on mobile after selection
      if (window.innerWidth < 640) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handleSelectSeat = (seatId: string) => {
    if (selectedStudentId) {
      // Move selected student to this seat
      moveStudent(selectedStudentId, seatId);
      setSelectedStudentId(null);
      setSelectedSeatId(null);
    } else if (selectedSeatId) {
      if (selectedSeatId === seatId) {
        setSelectedSeatId(null);
      } else {
        // Swap students between seats
        const student1 = students.find(s => s.seatId === selectedSeatId && s.classId === selectedClassId);
        const student2 = students.find(s => s.seatId === seatId && s.classId === selectedClassId);
        
        if (student1) {
          moveStudent(student1.id, seatId);
        } else if (student2) {
          moveStudent(student2.id, selectedSeatId);
        }
        setSelectedSeatId(null);
      }
    } else {
      setSelectedSeatId(seatId);
      setSelectedStudentId(null);
    }
  };

  const currentClass = classes.find(c => c.id === selectedClassId);

  const handleDownloadPDF = () => {
    window.print();
  };

  const classStudents = students.filter(s => s.classId === selectedClassId);
  const unseatedStudents = classStudents.filter(s => !s.seatId);
  const seatedStudents = classStudents.filter(s => s.seatId);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center text-slate-500 max-w-md px-6 text-center">
          {apiError ? (
            <>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <X size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Erro de Conexão</h2>
              <p className="text-slate-600 mb-6">{apiError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Tentar Novamente
              </button>
            </>
          ) : (
            <>
              <Loader2 size={48} className="animate-spin mb-4 text-blue-600" />
              <p className="font-medium">Carregando dados da planilha...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isSystemClosed) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogOut size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Sessão Encerrada</h2>
          <p className="text-slate-600 mb-8">
            Você saiu do sistema com segurança. Todas as alterações salvas foram preservadas na planilha.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            Entrar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 font-sans print:h-auto print:bg-white">
      {/* Header */}
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm z-30 print:hidden">
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="sm:hidden p-2 hover:bg-slate-100 rounded-md text-slate-600 relative"
          >
            {isSidebarOpen ? <X size={24} /> : (
              <>
                <Menu size={24} />
                {unseatedStudents.length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full ring-1 ring-white">
                    {unseatedStudents.length}
                  </span>
                )}
              </>
            )}
          </button>
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg text-white">
            <Users size={20} className="sm:w-6 sm:h-6" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate max-w-[120px] sm:max-w-none">Mapeamento</h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {classes.length > 0 ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <select 
                value={selectedClassId || ''} 
                onChange={e => setSelectedClassId(e.target.value)}
                className="border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 sm:py-2 sm:px-3 bg-slate-50 text-sm sm:text-base max-w-[100px] sm:max-w-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button 
                onClick={openEditClassModal}
                className="text-slate-500 hover:bg-slate-100 p-1.5 sm:p-2 rounded-md transition-colors"
                title="Editar Turma"
              >
                <Edit size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={requestDeleteClass}
                className="text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-md transition-colors"
                title="Excluir Turma"
              >
                <Trash2 size={18} className="sm:w-5 sm:h-5" />
              </button>
              <div className="hidden sm:block h-6 w-px bg-slate-300 mx-1"></div>
              
              {currentClass?.isLocked ? (
                <button 
                  onClick={handleUnlockMap}
                  className="text-amber-600 hover:bg-amber-50 p-1.5 sm:p-2 rounded-md transition-colors flex items-center gap-1 sm:gap-2 font-medium text-sm"
                  title="Editar Mapa"
                >
                  <Unlock size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden md:inline">Editar Mapa</span>
                </button>
              ) : (
                <button 
                  onClick={handleSaveMap}
                  className={`p-1.5 sm:p-2 rounded-md transition-colors flex items-center gap-1 sm:gap-2 font-medium text-sm ${
                    unseatedStudents.length > 0 
                      ? 'text-slate-400 bg-slate-100 cursor-not-allowed' 
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                  title={unseatedStudents.length > 0 ? "Posicione todos os alunos para salvar" : "Salvar Mapa"}
                >
                  <Save size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden md:inline">
                    Salvar Mapa {isDirty && <span className="ml-1 text-orange-500">●</span>}
                  </span>
                </button>
              )}

              <div className="hidden sm:block h-6 w-px bg-slate-300 mx-1"></div>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="text-emerald-600 hover:bg-emerald-50 p-1.5 sm:p-2 rounded-md transition-colors flex items-center gap-1 sm:gap-2 font-medium text-sm disabled:opacity-50"
                title="Baixar PDF"
              >
                {isGeneratingPDF ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} className="sm:w-5 sm:h-5" />}
                <span className="hidden md:inline">Baixar PDF</span>
              </button>

              <div className="hidden sm:block h-6 w-px bg-slate-300 mx-1"></div>
              
              <button 
                onClick={() => setShowHistoryModal(true)}
                className="text-slate-600 hover:bg-slate-100 p-1.5 sm:p-2 rounded-md transition-colors flex items-center gap-1 sm:gap-2 font-medium text-sm"
                title="Ver Histórico"
              >
                <History size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden md:inline">Histórico</span>
              </button>

              <div className="hidden sm:block h-6 w-px bg-slate-300 mx-1"></div>
              
              <button 
                onClick={handleExitSystem}
                className="text-slate-500 hover:bg-red-50 hover:text-red-600 p-1.5 sm:p-2 rounded-md transition-colors flex items-center gap-1 sm:gap-2 font-medium text-sm"
                title="Sair do Sistema"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden md:inline">Sair</span>
              </button>
            </div>
          ) : (
            <span className="hidden sm:inline text-slate-500 text-sm">Nenhuma turma cadastrada</span>
          )}
          
          <div className="hidden sm:block h-8 w-px bg-slate-200 mx-2"></div>
          
          <button 
            onClick={openAddClassModal}
            className="bg-slate-800 hover:bg-slate-700 text-white p-2 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            title="Nova Turma"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nova Turma</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden print:overflow-visible relative">
        {currentClass ? (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={`
              fixed inset-0 z-40 bg-black/50 transition-opacity sm:hidden
              ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setIsSidebarOpen(false)} />
            
            <div className={`
              fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 sm:z-0 print:hidden
              ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
              <Sidebar 
                students={unseatedStudents} 
                onAddStudent={requestAddStudent} 
                onDeleteStudent={requestDeleteStudent}
                selectedStudentId={selectedStudentId}
                onSelectStudent={handleSelectStudent}
                onClose={() => setIsSidebarOpen(false)}
                isLocked={currentClass?.isLocked || false}
              />
            </div>
            
            <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0 print:overflow-visible bg-slate-100 relative">
              {/* Floating Button for Mobile Student List */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className={`sm:hidden fixed bottom-6 right-6 z-30 p-4 rounded-full shadow-2xl transition-all ${
                  selectedStudentId ? 'bg-blue-600 text-white scale-110' : 'bg-white text-slate-700'
                }`}
              >
                <div className="relative">
                  <Users size={24} />
                  {unseatedStudents.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
                      {unseatedStudents.length}
                    </span>
                  )}
                </div>
              </button>

              {/* Selection Status Bar */}
              {(selectedStudentId || selectedSeatId) && !currentClass?.isLocked && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 animate-bounce">
                  <span className="text-sm font-medium">
                    {selectedStudentId ? 'Selecione um lugar no mapa' : 'Selecione um aluno na lista'}
                  </span>
                  <button 
                    onClick={() => {
                      setSelectedStudentId(null);
                      setSelectedSeatId(null);
                    }}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <ClassroomMap 
                students={seatedStudents} 
                currentClass={currentClass} 
                onDeleteStudent={requestDeleteStudent}
                onUnseatStudent={(id) => moveStudent(id, 'sidebar')}
                selectedSeatId={selectedSeatId}
                onSelectSeat={handleSelectSeat}
                onSelectStudent={handleSelectStudent}
                isLocked={currentClass?.isLocked || false}
              />
            </div>
            <DragOverlay>
              {activeStudent && !currentClass?.isLocked ? (
                <div className="w-24 h-16 sm:w-28 sm:h-20 opacity-90 shadow-xl transform scale-100 sm:scale-105">
                  <StudentCard student={activeStudent} isLocked={false} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Users size={64} className="mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma turma selecionada</h2>
            <p>Crie uma nova turma para começar a organizar os assentos.</p>
            <button 
              onClick={openAddClassModal}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={20} /> Criar Primeira Turma
            </button>
          </div>
        )}
      </main>

      {/* Modal de Turma (Criar/Editar) */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {editingClassId ? 'Editar Turma' : 'Criar Nova Turma'}
            </h2>
            <form onSubmit={handleClassSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Turma</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: 6º Ano A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. de Filas (Colunas)</label>
                    <div className="flex items-center">
                      <button 
                        type="button"
                        onClick={() => setNewClassCols(Math.max(1, (parseInt(newClassCols.toString()) || 1) - 1))}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-l-md px-3 py-2 text-slate-600 transition-colors"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        min="1" max="15" required
                        value={newClassCols}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setNewClassCols('' as any);
                          } else {
                            setNewClassCols(parseInt(val) || 1);
                          }
                        }}
                        className="w-full border-y border-slate-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setNewClassCols(Math.min(15, (parseInt(newClassCols.toString()) || 1) + 1))}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-r-md px-3 py-2 text-slate-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Carteiras por Fila (Linhas)</label>
                    <div className="flex items-center">
                      <button 
                        type="button"
                        onClick={() => setNewClassRows(Math.max(1, (parseInt(newClassRows.toString()) || 1) - 1))}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-l-md px-3 py-2 text-slate-600 transition-colors"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        min="1" max="15" required
                        value={newClassRows}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setNewClassRows('' as any);
                          } else {
                            setNewClassRows(parseInt(val) || 1);
                          }
                        }}
                        className="w-full border-y border-slate-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setNewClassRows(Math.min(15, (parseInt(newClassRows.toString()) || 1) + 1))}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-r-md px-3 py-2 text-slate-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Posição da Porta</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setNewDoorPosition('left')}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          newDoorPosition === 'left' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Esquerda
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewDoorPosition('right')}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          newDoorPosition === 'right' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Direita
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Posição da Mesa</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setNewDeskPosition('left')}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          newDeskPosition === 'left' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Esquerda
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewDeskPosition('right')}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          newDeskPosition === 'right' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Direita
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  {editingClassId ? 'Salvar Alterações' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Novo Aluno */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Adicionar Aluno</h2>
            <form onSubmit={handleAddStudentSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Aluno</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação (Exclusão) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h2>
            <p className="text-slate-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white rounded-md font-medium transition-colors ${confirmModal.confirmColor || 'bg-red-600 hover:bg-red-700'}`}
              >
                {confirmModal.confirmLabel || 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta/Erro */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">{alertModal.title}</h2>
            <p className="text-slate-600 mb-6">{alertModal.message}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Salvar Mapa (Nome do Professor) */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Salvar Mapeamento
            </h2>
            <form onSubmit={confirmSaveMap}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Professor Responsável</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Histórico de Alterações</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {currentClass?.history && currentClass.history.length > 0 ? (
                <div className="space-y-4">
                  {[...currentClass.history].reverse().map((entry) => (
                    <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-slate-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          entry.action === 'save' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.action === 'save' ? 'SALVO' : 'DESTRAVADO'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(entry.date).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">
                        Responsável: <span className="font-semibold">{entry.teacherName}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <History size={48} className="mx-auto mb-2 opacity-20" />
                  <p>Nenhum histórico registrado para esta turma.</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
