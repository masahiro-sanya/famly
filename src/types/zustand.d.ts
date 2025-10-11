declare module 'zustand' {
  type StateCreator<T> = (set: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void, get: () => T) => T;
  export default function create<T>(creator: StateCreator<T>): (selector?: (s: T) => any) => any;
}

