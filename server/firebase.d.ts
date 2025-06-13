declare module 'firebase/app' {
  export function initializeApp(config: any): any;
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any;
  export function collection(db: any, path: string): any;
  export function doc(db: any, path: string, ...pathSegments: string[]): any;
  export function getDocs(reference: any): Promise<any>;
  export function getDoc(reference: any): Promise<any>;
  export function addDoc(reference: any, data: any): Promise<any>;
  export function updateDoc(reference: any, data: any): Promise<any>;
  export function deleteDoc(reference: any): Promise<any>;
  export function query(reference: any, ...queryConstraints: any[]): any;
  export function where(fieldPath: string, opStr: any, value: any): any;
  export function orderBy(fieldPath: string, directionStr?: any): any;
  export class Timestamp {
    constructor(seconds: number, nanoseconds: number);
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    toDate(): Date;
  }
  export type Firestore = any;
}