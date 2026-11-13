export interface DeliveryFailureReport {
  postId: string;
  title: string;
  postVersion: number;
  approvalStatus: string;
  generatedAt: string;
  destinations: Array<{
    targetId: string; targetVersion: number; accountName: string; platform: string;
    status: string; errorCode: string | null; errorMessage: string | null;
    cause: string; nextSteps: string[]; connection: string; stage: string;
    attempts: number; updatedAt: string; canRetry: boolean; retryBlockedReason: string | null;
    history: Array<{ id: string; startedAt: string; finishedAt: string | null; result: string; errorCode: string | null }>;
  }>;
}
