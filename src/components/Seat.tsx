import { useDroppable } from '@dnd-kit/core';
import { StudentCard } from './StudentCard';
import { StudentData } from '../types';
import { X } from 'lucide-react';

interface SeatProps {
  key?: string;
  id: string;
  student?: StudentData;
  onDeleteStudent: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  onSelectStudent: (id: string) => void;
}

export function Seat({ id, student, onDeleteStudent, isSelected, onSelect, onSelectStudent }: SeatProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col items-center">
      <div 
        ref={setNodeRef}
        onClick={onSelect}
        className={`relative w-24 h-16 sm:w-28 sm:h-20 border-2 flex items-center justify-center p-1 transition-all cursor-pointer ${
          isSelected ? 'ring-4 ring-blue-500 ring-offset-2 rounded-lg scale-95 z-20' : ''
        } ${
          isOver ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-400'
        } print:border-black print:bg-white`}
      >
        {student ? (
          <div className="w-full h-full group relative">
            <div 
              className="w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                onSelectStudent(student.id);
              }}
            >
              <StudentCard student={student} />
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteStudent(student.id);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm hover:bg-red-600 print:hidden"
              title="Remover Aluno"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="w-full h-full border-2 border-slate-200 flex items-center justify-center bg-slate-50 print:border-none print:bg-transparent">
            <span className="text-slate-400 text-xs font-medium uppercase print:hidden">Vazio</span>
          </div>
        )}
      </div>
      {/* Chair drawing */}
      <div className={`w-16 h-3 border-b-2 border-l-2 border-r-2 border-slate-400 mt-1 print:border-black transition-colors ${isSelected ? 'border-blue-500' : ''}`}></div>
    </div>
  );
}
