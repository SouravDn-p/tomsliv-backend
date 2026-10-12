export interface ApplicationAIPayload {
  applicationId: string;
  jobId: string;
  cvId: string;
  idealCandidateId?: string;
  triggerReason:
    | 'job-updated'
    | 'cv-updated'
    | 'ideal-candidate-updated'
    | 'new-application'
    | 'application-shortlisted';
}
