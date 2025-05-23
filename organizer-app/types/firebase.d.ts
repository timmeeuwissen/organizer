// Type definition for Firebase Firestore Timestamp
export interface FirebaseTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

// Type that allows either a Date or a Firestore Timestamp
export type DateOrTimestamp = Date | FirebaseTimestamp;
