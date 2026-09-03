export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = "APP_ERROR",
  ) {
    super(message);
  }
}

export function userError(
  message: string,
  statusCode = 400,
  code = "BAD_REQUEST",
) {
  return new AppError(message, statusCode, code);
}
