import ApiError from '../utils/ApiError.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    req.validated = { ...(req.validated || {}), [source]: result.data };
    // Replace with parsed (coerced, stripped) data
    req[source] = result.data;
    return next();
  };
}
