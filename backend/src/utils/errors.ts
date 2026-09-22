export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const Errors = {
  NotFound: (msg = 'Resource not found') => new ApiError(404, msg),
  Forbidden: (msg = 'Forbidden') => new ApiError(403, msg),
  BadRequest: (msg = 'Invalid request parameters') => new ApiError(400, msg),
  Unauthorized: (msg = 'Unauthorized') => new ApiError(401, msg),
  Conflict: (msg = 'Conflict') => new ApiError(409, msg),
};
