import { useDroppable } from '@dnd-kit/core';
import { StudentCard } from './StudentCard';
import { StudentData } from '../types';
import { Plus, X } from 'lucide-react';

interface SidebarProps {
  students: StudentData[];
  onAddStudent: () => void;
  onDeleteStudent: (id: string) => void;
}

export function Sidebar({ students, onAddStudent, onDeleteStudent }: SidebarProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'sidebar' });

  return (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          Sem Assento 
          <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full">
            {students.length}
          </span>
        </h2>
        <button 
          onClick={onAddStudent} 
          className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-md transition-colors" 
          title="Adicionar Aluno"
        >
          <Plus size={20} />
        </button>
      </div>
      <div 
        ref={setNodeRef}
        className={`flex-1 overflow-auto p-4 flex flex-col gap-3 transition-colors ${isOver ? 'bg-blue-50/50' : ''}`}
      >
        {students.map(student => (
          <div key={student.id} className="relative group h-16">
            <StudentCard student={student} />
            <button 
              onClick={() => onDeleteStudent(student.id)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm hover:bg-red-600"
              title="Remover Aluno"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {students.length === 0 && (
          <div className="text-center mt-8 text-slate-400 flex flex-col items-center">
            <p className="text-sm">Todos os alunos estão sentados ou a lista está vazia.</p>
            <button 
              onClick={onAddStudent}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              + Adicionar Aluno
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
