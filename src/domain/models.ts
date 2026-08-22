export type UserProfile = {
  name: string;
  email: string;
  householdId: string;
};

export type Task = {
  id: string;
  title: string;
  userId: string;
  userName?: string;
  householdId: string;
  status?: 'done' | 'pending';
  createdAt?: import('firebase/firestore').Timestamp;
  dateKey?: string;
  thanksCount?: number;
  reactions?: Record<string, number>;
  completedAt?: import('firebase/firestore').Timestamp;
  completedByUserId?: string;
  completedByName?: string;
};

export type DefaultTask = {
  id: string;
  title: string;
  daysOfWeek: number[]; // 0=Sun ... 6=Sat
  order?: number;
};
