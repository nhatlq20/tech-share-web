export const requireOwner = (req, res, next) => {
  const allowed = ['owner', 'both', 'admin'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ chủ thiết bị (Owner) mới có quyền thực hiện thao tác này.',
    });
  }

  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Yêu cầu quyền Quản trị viên (Admin).',
    });
  }

  next();
};
