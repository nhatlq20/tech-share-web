export const requireOwner = (req, res, next) => {
  if (req.user?.role !== "owner") {
    return res.status(403).json({
      success: false,
      message: "Only owners can post devices",
    });
  }

  next();
};
