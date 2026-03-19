export type ClassData = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  doorPosition?: 'left' | 'right';
  deskPosition?: 'left' | 'right';
  lastUpdated?: string;
  isLocked?: boolean;
};

export type StudentData = {
  id: string;
  classId: string;
  name: string;
  seatId: string | null;
};
