import { Seat } from './Seat';
import { ClassData, StudentData } from '../types';

interface ClassroomMapProps {
  students: StudentData[];
  currentClass: ClassData;
  onDeleteStudent: (id: string) => void;
}

export function ClassroomMap({ students, currentClass, onDeleteStudent }: ClassroomMapProps) {
  return (
    <div id="classroom-map-container" className="max-w-5xl mx-auto bg-white p-10 shadow-lg rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none">
      <div className="text-center mb-10 print:mb-6">
        <h1 className="text-2xl font-bold uppercase mb-3 text-slate-800 print:text-black print:text-xl">
          MAPEAMENTO DE SALA – TURMA: {currentClass.name}
        </h1>
        <p className="text-slate-600 font-medium max-w-2xl mx-auto print:text-black print:text-sm">
          O posicionamento de cada estudante deve ser respeitado de acordo com a organização do Mapa de Sala durante todas as aulas!
        </p>
      </div>

      <div className="flex justify-between mb-16 px-4 print:mb-8">
        <div className={`w-36 h-20 bg-slate-200 border-2 border-slate-400 flex items-center justify-center text-center font-bold text-sm text-slate-700 shadow-sm print:border-black print:text-black ${currentClass.doorPosition === 'right' ? 'order-last' : 'order-first'}`}>
          PORTA DA<br/>SALA
        </div>
        <div className={`w-36 h-20 bg-slate-200 border-2 border-slate-400 flex items-center justify-center text-center font-bold text-sm text-slate-700 shadow-sm print:border-black print:text-black ${currentClass.deskPosition === 'right' ? 'order-last' : 'order-first'}`}>
          MESA DO<br/>PROFESSOR
        </div>
      </div>

      <div className="overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 print:overflow-visible print:pb-0 scrollbar-hide flex justify-center">
        <div className="min-w-max origin-top transition-transform duration-300 sm:scale-100 scale-[0.55] xs:scale-[0.65] sm:mb-0 -mb-[55%] xs:-mb-[45%]">
          <div 
            className="grid gap-x-4 sm:gap-x-8 md:gap-x-16 gap-y-10 justify-items-center print:min-w-0 print:w-full print:gap-x-2 print:gap-y-6"
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
                  <Seat id={seatId} student={student} onDeleteStudent={onDeleteStudent} />
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
