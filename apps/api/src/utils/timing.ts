export type TimingLogger = (
  event: Record<string, unknown>,
  message: string,
) => void;

export const noopTimingLogger: TimingLogger = () => undefined;

export async function timeOperation<T>(
  logger: TimingLogger,
  stage: string,
  operation: string,
  work: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await work();
    logger(
      {
        event: "timing",
        stage,
        operation,
        durationMs: Math.round(performance.now() - startedAt),
        success: true,
      },
      `${stage} completed`,
    );
    return result;
  } catch (error) {
    logger(
      {
        event: "timing",
        stage,
        operation,
        durationMs: Math.round(performance.now() - startedAt),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      `${stage} failed`,
    );
    throw error;
  }
}