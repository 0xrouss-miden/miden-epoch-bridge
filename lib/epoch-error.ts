export function epochExecutionError(error: unknown): string {
  const detail = error instanceof Error ? error.message : 'Could not execute the intent.';
  if (error instanceof Error && error.name === 'APIError') {
    const status = (error as Error & { status?: number }).status;
    return `Epoch API${status ? ` (HTTP ${status})` : ''}: ${detail}. If you already confirmed the deposit, it may still be in Compact. Check its status before depositing again.`;
  }
  return detail;
}
