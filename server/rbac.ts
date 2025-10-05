import type { RequestHandler } from "express";
import { storage } from "./storage";

export const PERMISSIONS = {
  // Content permissions
  'content:view': 'View content in CMS',
  'content:create': 'Create new content',
  'content:edit': 'Edit existing content',
  'content:delete': 'Delete content',
  'content:publish': 'Publish content',
  
  // Media permissions
  'media:view': 'View media library',
  'media:upload': 'Upload media files',
  'media:delete': 'Delete media files',
  
  // User management
  'users:view': 'View user list',
  'users:edit': 'Edit user roles',
  'users:delete': 'Delete users',
  
  // System permissions
  'system:admin': 'Full system access',
  'system:settings': 'Modify system settings',
  'system:roles': 'Manage roles and permissions',
};

export const ROLE_LEVELS = {
  'content_viewer': 1,
  'content_editor': 5,
  'content_admin': 8,
  'super_admin': 10,
};

function matchesWildcard(permission: string, pattern: string): boolean {
  if (pattern === permission) return true;
  
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return permission.startsWith(prefix);
  }
  
  return false;
}

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (userPermissions.includes('system:admin')) {
    return true;
  }
  
  for (const permission of userPermissions) {
    if (matchesWildcard(requiredPermission, permission)) {
      return true;
    }
  }
  
  return false;
}

export const requireRole = (minRole: string): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user;
    const userId = user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    try {
      const userRoles = await storage.getUserRoles(userId);
      
      if (!userRoles || userRoles.length === 0) {
        return res.status(403).json({ error: 'No roles assigned' });
      }

      const minLevel = ROLE_LEVELS[minRole as keyof typeof ROLE_LEVELS] || 0;
      
      const hasRequiredRole = userRoles.some(role => {
        const roleLevel = role.level || 0;
        return roleLevel >= minLevel;
      });

      if (!hasRequiredRole) {
        return res.status(403).json({ 
          error: 'Insufficient permissions', 
          required: minRole 
        });
      }

      return next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
  };
};

export const requirePermission = (permission: string): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user;
    const userId = user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    try {
      const userPermissions = await storage.getUserPermissions(userId);
      
      if (!hasPermission(userPermissions, permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions', 
          required: permission 
        });
      }

      return next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Failed to verify permission' });
    }
  };
};

export const requireAnyPermission = (permissions: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user;
    const userId = user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    try {
      const userPermissions = await storage.getUserPermissions(userId);
      
      const hasAnyPermission = permissions.some(perm => 
        hasPermission(userPermissions, perm)
      );

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions', 
          requiredAny: permissions 
        });
      }

      return next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Failed to verify permissions' });
    }
  };
};

export const combineMiddleware = (...middlewares: RequestHandler[]): RequestHandler => {
  return async (req, res, next) => {
    let index = 0;
    
    const runNext = async () => {
      if (index >= middlewares.length) {
        return next();
      }
      
      const middleware = middlewares[index++];
      await middleware(req, res, runNext);
    };
    
    await runNext();
  };
};
