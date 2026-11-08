import mongoose from 'mongoose';
import AdminAuditLog from '../../models/AdminAuditLog.js';

/**
 * 1. GET /api/admin/audit-logs
 * Truy vấn nhật ký can thiệp của Quản trị viên với bộ lọc và phân trang
 */
export const getAdminAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const { action, targetType, status, startDate, endDate, search } = req.query;
    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { action: regex },
        { targetType: regex },
        { targetId: regex },
        { adminEmail: regex },
        { adminName: regex },
        { reason: regex },
      ];
    }

    const total = await AdminAuditLog.countDocuments(query);
    const logs = await AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/admin/audit-logs/export
 * Xuất dữ liệu nhật ký kiểm toán dạng file CSV cho tuân thủ bảo mật
 */
export const exportAdminAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, status } = req.query;
    const query = {};
    if (action && action !== 'all') query.action = action;
    if (targetType && targetType !== 'all') query.targetType = targetType;
    if (status && status !== 'all') query.status = status;

    const logs = await AdminAuditLog.find(query).sort({ createdAt: -1 }).limit(1000).lean();

    const filename = `TechShare_Audit_Logs_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const header = '\uFEFFThời gian,Quản trị viên,Email,Hành động,Đối tượng,Target ID,Lý do,Trạng thái,IP\n';
    const rows = logs
      .map((l) => {
        const time = new Date(l.createdAt).toLocaleString('vi-VN');
        const adminName = (l.adminName || 'Admin').replace(/"/g, '""');
        const email = (l.adminEmail || '').replace(/"/g, '""');
        const act = (l.action || '').replace(/"/g, '""');
        const target = (l.targetType || '').replace(/"/g, '""');
        const tId = (l.targetId || '').replace(/"/g, '""');
        const rsn = (l.reason || '').replace(/"/g, '""');
        const st = l.status || 'success';
        const ip = l.ipAddress || '';
        return `"${time}","${adminName}","${email}","${act}","${target}","${tId}","${rsn}","${st}","${ip}"`;
      })
      .join('\n');

    return res.status(200).send(header + rows);
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/admin/audit-logs/stats
 * Thống kê tổng quan các hành vi can thiệp của ban quản trị
 */
export const getAdminAuditStats = async (req, res, next) => {
  try {
    const totalLogs = await AdminAuditLog.countDocuments();
    const successLogs = await AdminAuditLog.countDocuments({ status: 'success' });
    const failedLogs = await AdminAuditLog.countDocuments({ status: 'failure' });

    // Đếm theo nhóm hành động
    const actionGroups = await AdminAuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    return res.json({
      success: true,
      data: {
        totalLogs,
        successLogs,
        failedLogs,
        successRate: totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100,
        topActions: actionGroups.map((g) => ({ action: g._id, count: g.count })),
      },
    });
  } catch (err) {
    next(err);
  }
};
