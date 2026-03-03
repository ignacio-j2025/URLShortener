export function successResponse<T>(data: T) {
  return { success: true as const, data };
}

export function errorResponse(code: string, message: string | object) {
  return {
    success: false as const,
    error: { code, message },
  };
}
