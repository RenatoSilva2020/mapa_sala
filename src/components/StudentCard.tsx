import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { StudentData } from '../types';

interface StudentCardProps {
  student: StudentData;
}

export function StudentCard({ student }: StudentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
    data: student,
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
      {...listeners}
      {...attributes}
      className={`w-full h-full min-h-[3rem] bg-white border-2 flex items-center justify-center text-center p-1 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'border-blue-500 shadow-lg' : 'border-slate-300 shadow-sm hover:border-blue-400 hover:shadow'
      }`}
    >
      <span className="text-xs font-semibold break-words line-clamp-3 uppercase text-slate-700 select-none">
        {student.name}
      </span>
    </div>
  );
}
