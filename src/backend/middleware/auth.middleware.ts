import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  console.log('[Auth] requireAuth called, header:', authHeader ? 'present' : 'missing');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] No Bearer token found');
    return res.status(401).json({ success: false, message: 'Chưa xác thực' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'student_management_secret_key') as any;
    req.user = payload;
    console.log('[Auth] Token verified, user:', payload.role, payload.id);
    next();
  } catch (err: any) {
    console.log('[Auth] Token verify failed:', err.message);
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};

export const requireManager = (req: AuthRequest, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if ((req as AuthRequest).user?.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }
    next();
  });
};
