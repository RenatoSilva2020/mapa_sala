/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, closestCenter, DragOverlay } from '@dnd-kit/core';
import { Trash2, Users, Loader2 } from 'lucide-react';
import { ClassroomMap } from './components/ClassroomMap';
import { Sidebar } from './components/Sidebar';
import { ClassData, StudentData } from './types';
import { StudentCard } from './components/StudentCard';

const API_URL = import.meta.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbw.../exec";

export default function App() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassRows, setNewClassRows] = useState(6);
  const [newClassCols, setNewClassCols] = useState(6);

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
        
        const formattedStudents = (data.estudantes || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          classId: s.classId,
          seatId: s.row && s.col ? `seat-${s.row - 1}-${s.col - 1}` : null
        }));
        
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
        // text/plain evita requisições preflight (OPTIONS) que o Apps Script não lida bem por padrão
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

  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      const newClass = { 
        id: crypto.randomUUID(), 
        name: newClassName.trim(),
        rows: newClassRows,
        cols: newClassCols
      };
      setClasses([...classes, newClass]);
      setSelectedClassId(newClass.id);
      sendPostRequest('addClass', newClass);
      setShowClassModal(false);
      setNewClassName('');
      setNewClassRows(6);
      setNewClassCols(6);
    }
  };

  const handleDeleteClass = () => {
    if (!selectedClassId) return;
    if (confirm('Tem certeza que deseja excluir esta turma e todos os seus alunos?')) {
      setClasses(classes.filter(c => c.id !== selectedClassId));
      setStudents(students.filter(s => s.classId !== selectedClassId));
      setSelectedClassId(classes.length > 1 ? classes.find(c => c.id !== selectedClassId)?.id || null : null);
      sendPostRequest('deleteClass', { id: selectedClassId });
    }
  };

  const handleAddStudent = () => {
    if (!selectedClassId) return;
    const name = prompt('Nome do aluno:');
    if (name?.trim()) {
      const newStudent = {
        id: crypto.randomUUID(),
        classId: selectedClassId,
        name: name.trim(),
        seatId: null,
      };
      setStudents([...students, newStudent]);
      sendPostRequest('addStudent', { ...newStudent, row: null, col: null });
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Excluir este aluno?')) {
      setStudents(students.filter(s => s.id !== id));
      sendPostRequest('deleteStudent', { id });
    }
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
                onClick={handleDeleteClass}
                className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors"
                title="Excluir Turma"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ) : (
            <span className="text-slate-500 text-sm">Nenhuma turma cadastrada</span>
          )}
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          <button 
            onClick={() => setShowClassModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Nova Turma
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
              onAddStudent={handleAddStudent} 
              onDeleteStudent={handleDeleteStudent}
            />
            <div className="flex-1 overflow-auto p-8">
              <ClassroomMap 
                students={seatedStudents} 
                currentClass={currentClass} 
                onDeleteStudent={handleDeleteStudent}
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
              onClick={() => setShowClassModal(true)}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Criar Primeira Turma
            </button>
          </div>
        )}
      </main>

      {/* Modal de Nova Turma */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Criar Nova Turma</h2>
            <form onSubmit={handleAddClassSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Turma</label>
                  <input 
                    type="text" 
                    required
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
                  Criar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
