export enum EventsEnum {
  // === Generic status events ===
  ERROR = 'error', // Server -> Client: operation failed
  SUCCESS = 'success', // Server -> Client: operation succeeded
}

export enum QueueEventsEnum {
  // === Notification events ===
  NOTIFICATION = 'queue:notification',
  GENERIC = 'queue:generic',
  APPLICATION_AI_ANALYSIS = 'queue:application-ai-analysis',
}
