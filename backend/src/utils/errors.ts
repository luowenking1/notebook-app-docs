export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const Errors = {
  NotFound: (msg = '资源不存在') => new ApiError(404, msg),
  Forbidden: (msg = '无权访问') => new ApiError(403, msg),
  BadRequest: (msg = '请求参数不合法') => new ApiError(400, msg),
  Unauthorized: (msg = '未授权') => new ApiError(401, msg),
  Conflict: (msg = '数据冲突') => new ApiError(409, msg),
};
