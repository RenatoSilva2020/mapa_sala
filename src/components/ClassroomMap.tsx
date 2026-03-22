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
  onUpdateRepresentative?: (value: string) => void;
  onUpdateTeacher?: (value: string) => void;
}

export function ClassroomMap({ 
  students, 
  currentClass, 
  onDeleteStudent,
  onUnseatStudent,
  selectedSeatId,
  onSelectSeat,
  onSelectStudent,
  isLocked,
  onUpdateRepresentative,
  onUpdateTeacher
}: ClassroomMapProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div id="classroom-map-container" className="w-full max-w-[95vw] mx-auto bg-white p-4 sm:p-10 shadow-lg rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:mx-auto">
      {/* Logo for Print Only - At the very top */}
      <div className="hidden print:flex print:justify-center print:mb-3">
        <img 
          src="https://i.ibb.co/pjLrw505/logo-cecy.png" 
          alt="Logo" 
          className="h-20 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Header Grid */}
      <div className="flex flex-col items-center mb-6 sm:mb-10 print:mb-2 print:w-full">
        {/* Text and Fields Column */}
        <div className="flex flex-col gap-3 w-full print:gap-2">
          <div className="text-center">
            <h1 className="text-base sm:text-xl font-bold uppercase mb-0.5 text-slate-900 print:text-black print:text-base leading-tight">
              MAPEAMENTO DE SALA<br />
              <span className="text-lg sm:text-3xl print:text-xl">TURMA: {currentClass.name}</span>
            </h1>
            {currentClass.lastUpdated && (
              <p className="text-[10px] text-slate-500 mb-1 print:text-black print:text-[12px]">
                Atualizado em: {formatDate(currentClass.lastUpdated)}
              </p>
            )}
            <p className="text-[10px] sm:text-sm text-slate-700 font-medium print:text-black max-w-2xl mx-auto print:text-[11px] print:leading-tight">
              O posicionamento de cada estudante deve ser respeitado de acordo com a organização do Mapa de Sala durante todas as aulas!
            </p>
          </div>

          {/* Editable Fields */}
          <div className="space-y-1.5 max-w-xl mx-auto w-full print:space-y-0.5 print:max-w-none">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 print:flex-row print:justify-center">
              <label className="text-[10px] sm:text-sm font-bold text-slate-900 uppercase whitespace-nowrap print:text-black print:text-[12px]">
                REPRESENTANTE DA TURMA:
              </label>
              <input 
                type="text"
                value={currentClass.classRepresentative || ''}
                onChange={(e) => onUpdateRepresentative?.(e.target.value.toUpperCase())}
                disabled={isLocked}
                className="flex-1 border-b border-slate-300 focus:border-slate-900 outline-none px-2 py-0.5 text-xs sm:text-base font-normal uppercase text-slate-800 disabled:bg-transparent disabled:border-transparent print:border-black print:text-black print:text-[12px] print:w-64 print:flex-none print:placeholder:text-transparent"
                placeholder="Digite o nome..."
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 print:flex-row print:justify-center">
              <label className="text-[10px] sm:text-sm font-bold text-slate-900 uppercase whitespace-nowrap print:text-black print:text-[12px]">
                PROFESSOR(A) REFERÊNCIA:
              </label>
              <input 
                type="text"
                value={currentClass.referenceTeacher || ''}
                onChange={(e) => onUpdateTeacher?.(e.target.value.toUpperCase())}
                disabled={isLocked}
                className="flex-1 border-b border-slate-300 focus:border-slate-900 outline-none px-2 py-0.5 text-xs sm:text-base font-normal uppercase text-slate-800 disabled:bg-transparent disabled:border-transparent print:border-black print:text-black print:text-[12px] print:w-64 print:flex-none print:placeholder:text-transparent"
                placeholder="Digite o nome..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-12 -mx-2 px-2 sm:mx-0 sm:px-0 print:overflow-visible print:pb-0 flex justify-start print:justify-center min-h-[500px] sm:min-h-0 w-full max-w-full">
        <div className="min-w-max mx-auto origin-top transition-transform duration-300 sm:scale-100 scale-[0.8] xs:scale-[0.9] sm:mb-0 -mb-[15%] xs:-mb-[5%] print:scale-100 print:mb-0 print:w-fit print:mx-auto print:min-w-0">
          {/* Door and Desk Row - Moved inside the fit-content container for alignment */}
          <div className="flex justify-between mb-6 sm:mb-12 px-0 print:mb-2 w-full gap-2">
            <div className={`flex-1 sm:flex-none sm:w-32 h-12 sm:h-16 bg-slate-200 border-2 border-slate-400 flex items-center justify-center text-center font-bold text-[9px] sm:text-xs text-slate-700 shadow-sm print:border-black print:text-black print:h-12 print:w-40 print:text-sm ${currentClass.doorPosition === 'right' ? 'order-last' : 'order-first'}`}>
              PORTA DA<br/>SALA
            </div>
            <div className={`flex-1 sm:flex-none sm:w-32 h-12 sm:h-16 bg-slate-200 border-2 border-slate-400 flex items-center justify-center text-center font-bold text-[9px] sm:text-xs text-slate-700 shadow-sm print:border-black print:text-black print:h-12 print:w-40 print:text-sm ${currentClass.deskPosition === 'right' ? 'order-last' : 'order-first'}`}>
              MESA DO<br/>PROFESSOR
            </div>
          </div>

          <div 
            className="grid gap-x-2 sm:gap-x-8 md:gap-x-16 gap-y-6 sm:gap-y-10 justify-items-center print:min-w-0 print:gap-x-6 print:gap-y-4"
            style={{ 
              gridTemplateColumns: `repeat(${currentClass.cols}, minmax(0, 1fr))`,
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
