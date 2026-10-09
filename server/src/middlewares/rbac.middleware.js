/**
 * RBAC middleware requiring specific roles on the active workspace membership.
 *
 * @param {Array<string>} allowedRoles e.g. ['owner', 'admin']
 */
export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({
        success: false,
        message: 'No active workspace membership found in request context.',
      });
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.membership.role}`,
      });
    }

    next();
  };
};
