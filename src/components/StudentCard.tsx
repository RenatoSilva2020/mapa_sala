import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { StudentData } from '../types';

interface StudentCardProps {
  student: StudentData;
  isLocked?: boolean;
}

export function StudentCard({ student, isLocked }: StudentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
    data: student,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isLocked ? {} : listeners)}
      {...(isLocked ? {} : attributes)}
      className={`w-full h-full min-h-[3rem] bg-white border-2 flex items-center justify-center text-center p-1 transition-shadow ${
        isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${
        isDragging ? 'border-blue-500 shadow-lg' : 'border-slate-300 shadow-sm hover:border-blue-400 hover:shadow'
      } print:border-none print:shadow-none print:p-0 print:bg-transparent`}
    >
      <span className="text-[10px] sm:text-xs font-semibold break-words line-clamp-3 uppercase text-slate-700 select-none print:text-black print:text-[10px] print:leading-tight">
        {student.name}
      </span>
    </div>
  );
}
