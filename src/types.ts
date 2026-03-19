export type ClassData = {
  id: string;
  name: string;
  rows: number;
  cols: number;
};

export type StudentData = {
  id: string;
  classId: string;
  name: string;
  seatId: string | null;
};
