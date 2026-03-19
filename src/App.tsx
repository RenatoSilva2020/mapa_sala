/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, closestCenter, DragOverlay } from '@dnd-kit/core';
import { Trash2, Users, Loader2, Edit, Plus, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ClassroomMap } from './components/ClassroomMap';
import { Sidebar } from './components/Sidebar';
import { ClassData, StudentData } from './types';
import { StudentCard } from './components/StudentCard';

const API_URL = import.meta.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbzaw8GP992s3pX_yshZvYTAABtfUlABqNDA2p8sjkKztiM0-e76O7oNxU5jVDPPsYeZ/exec";

export default function App() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Class Modal State
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassRows, setNewClassRows] = useState(6);
  const [newClassCols, setNewClassCols] = useState(6);

  // Student Modal State
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!API_URL || API_URL === "URL_DO_APPS_SCRIPT_AQUI") {
          console.warn("API_URL não configurada. Usando dados vazios.");
          setIsLoading(false);
          return;
        }
        
        const response = await fetch(API_URL);
        const data = await response.json();

        const formattedClasses = (data.turmas || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          rows: t.rows || 6,
          cols: t.cols || 6
        }));
        setClasses(formattedClasses);
        
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
        
        setStudents(formattedStudents);
        
        if (data.turmas && data.turmas.length > 0) {
          setSelectedClassId(data.turmas[0].id);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const sendPostRequest = async (action: string, payload: any) => {
    if (!API_URL || API_URL === "URL_DO_APPS_SCRIPT_AQUI") return;
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
    } catch (error) {
      console.error(`Erro na ação ${action}:`, error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const openAddClassModal = () => {
    setEditingClassId(null);
    setNewClassName('');
    setNewClassRows(6);
    setNewClassCols(6);
    setShowClassModal(true);
  };

  const openEditClassModal = () => {
    const current = classes.find(c => c.id === selectedClassId);
    if (current) {
      setEditingClassId(current.id);
      setNewClassName(current.name);
      setNewClassRows(current.rows);
      setNewClassCols(current.cols);
      setShowClassModal(true);
    }
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      if (editingClassId) {
        const updatedClass = {
          id: editingClassId,
          name: newClassName.trim(),
          rows: newClassRows,
          cols: newClassCols
        };
        setClasses(classes.map(c => c.id === editingClassId ? updatedClass : c));
        sendPostRequest('editClass', updatedClass);
      } else {
        const newClass = { 
          id: crypto.randomUUID(), 
          name: newClassName.trim(),
          rows: newClassRows,
          cols: newClassCols
        };
        setClasses([...classes, newClass]);
        setSelectedClassId(newClass.id);
        sendPostRequest('addClass', newClass);
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
      onConfirm: () => {
        setClasses(classes.filter(c => c.id !== selectedClassId));
        setStudents(students.filter(s => s.classId !== selectedClassId));
        setSelectedClassId(classes.length > 1 ? classes.find(c => c.id !== selectedClassId)?.id || null : null);
        sendPostRequest('deleteClass', { id: selectedClassId });
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
      setShowStudentModal(false);
    }
  };

  const requestDeleteStudent = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aluno',
      message: 'Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.',
      onConfirm: () => {
        setStudents(students.filter(s => s.id !== id));
        sendPostRequest('deleteStudent', { id });
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

    setStudents((prev) => {
      const newStudents = [...prev];
      const studentIndex = newStudents.findIndex(s => s.id === studentId);
      if (studentIndex === -1) return prev;

      const student = newStudents[studentIndex];

      if (overId === 'sidebar') {
        newStudents[studentIndex] = { ...student, seatId: null };
        sendPostRequest('updateStudentSeat', { id: studentId, row: null, col: null });
      } else if (overId.startsWith('seat-')) {
        const occupiedIndex = newStudents.findIndex(s => s.seatId === overId && s.classId === student.classId);
        
        const [, rStr, cStr] = overId.split('-');
        const row = parseInt(rStr) + 1;
        const col = parseInt(cStr) + 1;

        if (occupiedIndex !== -1 && newStudents[occupiedIndex].id !== studentId) {
          // Swap
          const tempSeat = student.seatId;
          const occupiedStudent = newStudents[occupiedIndex];
          
          newStudents[studentIndex] = { ...student, seatId: overId };
          newStudents[occupiedIndex] = { ...occupiedStudent, seatId: tempSeat };
          
          const tempRow = tempSeat ? parseInt(tempSeat.split('-')[1]) + 1 : null;
          const tempCol = tempSeat ? parseInt(tempSeat.split('-')[2]) + 1 : null;

          sendPostRequest('swapStudents', {
            student1: { id: studentId, row, col },
            student2: { id: occupiedStudent.id, row: tempRow, col: tempCol }
          });
        } else {
          newStudents[studentIndex] = { ...student, seatId: overId };
          sendPostRequest('updateStudentSeat', { id: studentId, row, col });
        }
      }
      return newStudents;
    });
  };

  const currentClass = classes.find(c => c.id === selectedClassId);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('classroom-map-container');
    if (!element || !currentClass) return;
    
    setIsGeneratingPDF(true);
    
    // Save original styles to restore later
    const originalStyle = element.getAttribute('style') || '';
    const scrollContainer = element.querySelector('.overflow-x-auto') as HTMLElement;
    const originalScrollStyle = scrollContainer ? scrollContainer.getAttribute('style') || '' : '';
    
    try {
      // Temporarily adjust styles to ensure full capture without clipping
      element.style.maxWidth = 'none';
      element.style.width = 'max-content';
      if (scrollContainer) {
        scrollContainer.style.overflow = 'visible';
        scrollContainer.style.width = 'max-content';
      }

      // Small delay to allow browser to apply styles
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create a canvas from the specific element
      const canvas = await html2canvas(element, { 
        scale: 2, // Higher resolution
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF in landscape mode
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate ratio to fit image inside PDF
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Center the image
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // Format filename
      const fileName = `Mapa_de_Sala_${currentClass.name.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    } finally {
      // Restore original styles
      element.setAttribute('style', originalStyle);
      if (scrollContainer) {
        scrollContainer.setAttribute('style', originalScrollStyle);
      }
      setIsGeneratingPDF(false);
    }
  };

  const classStudents = students.filter(s => s.classId === selectedClassId);
  const unseatedStudents = classStudents.filter(s => !s.seatId);
  const seatedStudents = classStudents.filter(s => s.seatId);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center text-slate-500">
          <Loader2 size={48} className="animate-spin mb-4 text-blue-600" />
          <p className="font-medium">Carregando dados da planilha...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 font-sans">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Users size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Mapeamento de Sala</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {classes.length > 0 ? (
            <div className="flex items-center gap-2">
              <select 
                value={selectedClassId || ''} 
                onChange={e => setSelectedClassId(e.target.value)}
                className="border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 bg-slate-50"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button 
                onClick={openEditClassModal}
                className="text-slate-500 hover:bg-slate-100 p-2 rounded-md transition-colors"
                title="Editar Turma"
              >
                <Edit size={20} />
              </button>
              <button 
                onClick={requestDeleteClass}
                className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors"
                title="Excluir Turma"
              >
                <Trash2 size={20} />
              </button>
              <div className="h-6 w-px bg-slate-300 mx-1"></div>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-md transition-colors flex items-center gap-2 font-medium text-sm disabled:opacity-50"
                title="Baixar PDF"
              >
                {isGeneratingPDF ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                <span className="hidden sm:inline">Baixar PDF</span>
              </button>
            </div>
          ) : (
            <span className="text-slate-500 text-sm">Nenhuma turma cadastrada</span>
          )}
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          <button 
            onClick={openAddClassModal}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Nova Turma
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {currentClass ? (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <Sidebar 
              students={unseatedStudents} 
              onAddStudent={requestAddStudent} 
              onDeleteStudent={requestDeleteStudent}
            />
            <div className="flex-1 overflow-auto p-8">
              <ClassroomMap 
                students={seatedStudents} 
                currentClass={currentClass} 
                onDeleteStudent={requestDeleteStudent}
              />
            </div>
            <DragOverlay>
              {activeStudent ? (
                <div className="w-28 h-20 opacity-90 shadow-xl transform scale-105">
                  <StudentCard student={activeStudent} />
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
                    <input 
                      type="number" 
                      min="1" max="15" required
                      value={newClassCols}
                      onChange={e => setNewClassCols(parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Carteiras por Fila (Linhas)</label>
                    <input 
                      type="number" 
                      min="1" max="15" required
                      value={newClassRows}
                      onChange={e => setNewClassRows(parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
