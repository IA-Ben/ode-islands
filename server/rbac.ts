import type { RequestHandler } from "express";
import { storage } from "./storage";
import { NextRequest, NextResponse } from "next/server";

export const PERMISSIONS = {
  // Story/Content permissions
  'story:view': 'View stories and chapters',
  'story:create': 'Create new stories and chapters',
  'story:edit': 'Edit existing stories and chapters',
  'story:publish': 'Publish stories and chapters',
  'story:delete': 'Delete stories and chapters',
  
  // Events permissions
  'events:view': 'View events',
  'events:create': 'Create new events',
  'events:edit': 'Edit existing events',
  'events:publish': 'Publish events',
  'events:delete': 'Delete events',
  'events:operate': 'Operate live events (start/stop/moderate)',
  
  // Cards permissions
  'cards:view': 'View story cards',
  'cards:create': 'Create new cards',
  'cards:edit': 'Edit existing cards',
  'cards:publish': 'Publish cards',
  'cards:delete': 'Delete cards',
  
  // Rewards permissions
  'rewards:view': 'View reward rules',
  'rewards:create': 'Create new reward rules',
  'rewards:edit': 'Edit reward rules',
  'rewards:configure': 'Configure reward settings',
  'rewards:delete': 'Delete reward rules',
  
  // Featured rules permissions
  'featured:view': 'View featured content rules',
  'featured:create': 'Create new featured rules',
  'featured:edit': 'Edit featured rules',
  'featured:delete': 'Delete featured rules',
  
  // Orders permissions (for merchandise/tickets)
  'orders:view': 'View orders',
  'orders:create': 'Create new orders',
  'orders:edit': 'Edit existing orders',
  'orders:fulfill': 'Fulfill orders',
  'orders:delete': 'Delete orders',
  
  // Analytics permissions
  'analytics:view': 'View analytics and reports',
  'analytics:export': 'Export analytics data',
  'analytics:advanced': 'Access advanced analytics features',
  
  // User management permissions
  'users:view': 'View user list and profiles',
  'users:edit': 'Edit user details and roles',
  'users:manage_wallet': 'Manage user memory wallets',
  'users:manual_award': 'Manually award memories/rewards',
  'users:delete': 'Delete users',
  
  // Settings permissions
  'settings:view': 'View system settings',
  'settings:edit': 'Edit system settings',
  'settings:advanced': 'Access advanced system settings',
  
  // Media permissions (legacy, keeping for backward compatibility)
  'media:view': 'View media library',
  'media:upload': 'Upload media files',
  'media:edit': 'Edit media metadata',
  'media:delete': 'Delete media files',
  
  // QR Code permissions
  'qr:view': 'View QR codes',
  'qr:manage': 'Manage QR codes and validation',
  
  // System permissions (highest level)
  'system:admin': 'Full system access',
  'system:settings': 'Modify system settings',
  'system:roles': 'Manage roles and permissions',
  
  // Legacy content permissions (keeping for backward compatibility)
  'content:view': 'View content in CMS',
  'content:create': 'Create new content',
  'content:edit': 'Edit existing content',
  'content:delete': 'Delete content',
  'content:publish': 'Publish content',
};

export const ROLE_LEVELS = {
  'owner': 10,
  'admin': 9,
  'producer': 7,
  'operator': 5,
  'analyst': 3,
  'support': 2,
  
  // Legacy roles (backward compatibility - map to new roles)
  'super_admin': 10,
  'content_admin': 9,
  'content_editor': 7,
  'content_viewer': 3,
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'owner': [
    'system:admin',
    'system:settings',
    'system:roles',
    'story:*',
    'events:*',
    'cards:*',
    'rewards:*',
    'featured:*',
    'orders:*',
    'analytics:*',
    'users:*',
    'settings:*',
    'media:*',
    'qr:*',
    'content:*',
  ],
  
  'admin': [
    'system:settings',
    'story:*',
    'events:*',
    'cards:*',
    'rewards:*',
    'featured:*',
    'orders:*',
    'analytics:*',
    'users:view',
    'users:edit',
    'users:manage_wallet',
    'users:manual_award',
    'settings:view',
    'settings:edit',
    'media:*',
    'qr:*',
    'content:*',
  ],
  
  'producer': [
    'story:view',
    'story:create',
    'story:edit',
    'story:publish',
    'story:delete',
    'events:view',
    'events:create',
    'events:edit',
    'events:publish',
    'cards:view',
    'cards:create',
    'cards:edit',
    'cards:publish',
    'cards:delete',
    'rewards:view',
    'rewards:create',
    'rewards:edit',
    'featured:view',
    'featured:create',
    'featured:edit',
    'analytics:view',
    'users:view',
    'settings:view',
    'media:view',
    'media:upload',
    'media:edit',
    'content:view',
    'content:create',
    'content:edit',
    'content:publish',
  ],
  
  'operator': [
    'story:view',
    'story:publish',
    'events:view',
    'events:operate',
    'cards:view',
    'cards:edit',
    'rewards:view',
    'orders:view',
    'orders:fulfill',
    'analytics:view',
    'users:view',
    'users:manage_wallet',
    'users:manual_award',
    'qr:view',
    'qr:manage',
    'media:view',
    'content:view',
  ],
  
  'analyst': [
    'story:view',
    'events:view',
    'cards:view',
    'rewards:view',
    'orders:view',
    'analytics:view',
    'analytics:export',
    'users:view',
    'settings:view',
    'media:view',
    'content:view',
  ],
  
  'support': [
    'story:view',
    'events:view',
    'cards:view',
    'users:view',
    'analytics:view',
    'content:view',
  ],
  
  // Legacy role mappings (backward compatibility)
  'super_admin': [
    'system:admin',
    'system:settings',
    'system:roles',
    'story:*',
    'events:*',
    'cards:*',
    'rewards:*',
    'orders:*',
    'analytics:*',
    'users:*',
    'settings:*',
    'media:*',
    'qr:*',
    'content:*',
  ],
  
  'content_admin': [
    'system:settings',
    'story:*',
    'events:*',
    'cards:*',
    'rewards:*',
    'orders:*',
    'analytics:*',
    'users:view',
    'users:edit',
    'users:manage_wallet',
    'users:manual_award',
    'settings:view',
    'settings:edit',
    'media:*',
    'qr:*',
    'content:*',
  ],
  
  'content_editor': [
    'story:view',
    'story:create',
    'story:edit',
    'story:publish',
    'events:view',
    'events:create',
    'events:edit',
    'cards:view',
    'cards:create',
    'cards:edit',
    'analytics:view',
    'users:view',
    'settings:view',
    'media:view',
    'media:upload',
    'media:edit',
    'content:view',
    'content:create',
    'content:edit',
    'content:publish',
  ],
  
  'content_viewer': [
    'story:view',
    'events:view',
    'cards:view',
    'rewards:view',
    'orders:view',
    'analytics:view',
    'users:view',
    'media:view',
    'content:view',
  ],
};

export function getRolePermissions(roleName: string): string[] {
  return ROLE_PERMISSIONS[roleName] || [];
}

export function getAllPermissionsForUser(userRoles: { name: string; level: number }[]): string[] {
  const allPermissions = new Set<string>();
  
  for (const role of userRoles) {
    const rolePermissions = getRolePermissions(role.name);
    rolePermissions.forEach(perm => allPermissions.add(perm));
  }
  
  return Array.from(allPermissions);
}

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

export const requirePermissionExpress = (permission: string): RequestHandler => {
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

type NextRouteHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse>;

export function requirePermission(permission: string): (handler: NextRouteHandler) => NextRouteHandler {
  return function(handler: NextRouteHandler): NextRouteHandler {
    return async (req: NextRequest, context?: any) => {
      const session = (req as any).session;
      
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        );
      }
      
      const userId = session.userId || session.user.id;
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Invalid user session' }, 
          { status: 401 }
        );
      }
      
      try {
        const userPermissions = await storage.getUserPermissions(userId);
        
        if (!hasPermission(userPermissions, permission)) {
          return NextResponse.json(
            { 
              error: 'Insufficient permissions', 
              required: permission 
            }, 
            { status: 403 }
          );
        }
        
        return await handler(req, context);
      } catch (error) {
        console.error('Permission check error:', error);
        return NextResponse.json(
          { error: 'Failed to verify permission' }, 
          { status: 500 }
        );
      }
    };
  };
}
