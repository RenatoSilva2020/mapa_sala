import { Seat } from './Seat';
import { ClassData, StudentData } from '../types';

interface ClassroomMapProps {
  students: StudentData[];
  currentClass: ClassData;
  onDeleteStudent: (id: string) => void;
  onUnseatStudent: (id: string) => void;
  selectedSeatId: string | null;
  onSelectSeat: (id: string) => void;
  onSelectStudent: (id: string) => void;
  isLocked: boolean;
}

export function ClassroomMap({ 
  students, 
  currentClass, 
  onDeleteStudent,
  onUnseatStudent,
  selectedSeatId,
  onSelectSeat,
  onSelectStudent,
  isLocked
}: ClassroomMapProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div id="classroom-map-container" className="w-full max-w-[95vw] mx-auto bg-white p-4 sm:p-10 shadow-lg rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-fit print:mx-auto">
      <div className="text-center mb-6 sm:mb-10 print:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold uppercase mb-2 sm:mb-3 text-slate-800 print:text-black print:text-xl">
          MAPEAMENTO DE SALA – TURMA: {currentClass.name}
        </h1>
        {currentClass.lastUpdated && (
          <p className="text-xs sm:text-sm text-slate-500 mb-2 print:text-black">
            Atualizado em: {formatDate(currentClass.lastUpdated)}
          </p>
        )}
        <p className="text-[10px] sm:text-base text-slate-600 font-medium max-w-2xl mx-auto print:text-black print:text-sm px-2">
          O posicionamento de cada estudante deve ser respeitado de acordo com a organização do Mapa de Sala durante todas as aulas!
        </p>
      </div>

      <div className="flex justify-between mb-8 sm:mb-16 px-2 sm:px-4 print:mb-8 gap-2">
        <div className={`flex-1 sm:flex-none sm:w-36 h-14 sm:h-20 bg-slate-200 border-2 border-slate-400 flex items-center justify-center text-center font-bold text-[10px] sm:text-sm text-slate-700 shadow-sm print:border-black print:text-black ${currentClass.doorPosition === 'right' ? 'order-last' : 'order-first'}`}>
          PORTA DA<br/>SALA
        </div>
        <div className={`flex-1 sm:flex-none sm:w-36 h-14 sm:h-20 bg-slate-200 border-2 border-slate-400 flex items-center justify-center text-center font-bold text-[10px] sm:text-sm text-slate-700 shadow-sm print:border-black print:text-black ${currentClass.deskPosition === 'right' ? 'order-last' : 'order-first'}`}>
          MESA DO<br/>PROFESSOR
        </div>
      </div>

      <div className="overflow-x-auto pb-12 -mx-2 px-2 sm:mx-0 sm:px-0 print:overflow-visible print:pb-0 flex justify-start print:justify-center min-h-[500px] sm:min-h-0 w-full max-w-full">
        <div className="min-w-max mx-auto origin-top transition-transform duration-300 sm:scale-100 scale-[0.8] xs:scale-[0.9] sm:mb-0 -mb-[15%] xs:-mb-[5%] print:scale-100 print:mb-0">
          <div 
            className="grid gap-x-2 sm:gap-x-8 md:gap-x-16 gap-y-6 sm:gap-y-10 justify-items-center print:min-w-0 print:w-full print:gap-x-2 print:gap-y-6"
            style={{ 
              gridTemplateColumns: `repeat(${currentClass.cols}, minmax(100px, 1fr))`,
              width: 'fit-content'
            }}
          >
          {Array.from({ length: currentClass.rows }).map((_, rowIndex) => (
            Array.from({ length: currentClass.cols }).map((_, colIndex) => {
              const seatId = `seat-${rowIndex}-${colIndex}`;
              const student = students.find(s => s.seatId === seatId);
              return (
                <div key={seatId}>
                  <Seat 
                    id={seatId} 
                    student={student} 
                    onDeleteStudent={onDeleteStudent} 
                    onUnseatStudent={onUnseatStudent}
                    isSelected={selectedSeatId === seatId}
                    onSelect={() => !isLocked && onSelectSeat(seatId)}
                    onSelectStudent={onSelectStudent}
                    isLocked={isLocked}
                  />
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  </div>
);
}
