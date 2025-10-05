import { db } from "./db";
import { adminRoles, userRoles } from "../shared/schema";
import { eq, and } from "drizzle-orm";

export async function seedRoles() {
  console.log('🔐 Seeding system roles...');

  const systemRoles = [
    {
      name: 'super_admin',
      description: 'Full system access with all permissions',
      level: 10,
      permissions: [
        'system:admin',
        'system:settings',
        'system:roles',
        'content:*',
        'media:*',
        'users:*',
      ],
      isSystemRole: true,
    },
    {
      name: 'content_admin',
      description: 'Full CMS access - create, edit, delete content and media',
      level: 8,
      permissions: [
        'content:view',
        'content:create',
        'content:edit',
        'content:delete',
        'content:publish',
        'media:view',
        'media:upload',
        'media:delete',
      ],
      isSystemRole: true,
    },
    {
      name: 'content_editor',
      description: 'Create and edit content, upload media',
      level: 5,
      permissions: [
        'content:view',
        'content:create',
        'content:edit',
        'media:view',
        'media:upload',
      ],
      isSystemRole: true,
    },
    {
      name: 'content_viewer',
      description: 'Read-only CMS access',
      level: 1,
      permissions: [
        'content:view',
        'media:view',
      ],
      isSystemRole: true,
    },
  ];

  for (const role of systemRoles) {
    try {
      const [existingRole] = await db
        .select()
        .from(adminRoles)
        .where(eq(adminRoles.name, role.name));

      if (existingRole) {
        await db
          .update(adminRoles)
          .set({
            description: role.description,
            level: role.level,
            permissions: role.permissions,
            isSystemRole: role.isSystemRole,
            updatedAt: new Date(),
          })
          .where(eq(adminRoles.id, existingRole.id));
        
        console.log(`✓ Updated system role: ${role.name}`);
      } else {
        await db.insert(adminRoles).values(role);
        console.log(`✓ Created system role: ${role.name}`);
      }
    } catch (error) {
      console.error(`✗ Failed to seed role ${role.name}:`, error);
    }
  }

  console.log('✅ System roles seeding complete');
}

export async function assignDefaultAdminRole(userId: string, assignedBy?: string) {
  try {
    const [contentAdminRole] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.name, 'content_admin'));

    if (!contentAdminRole) {
      console.error('Content admin role not found');
      return;
    }

    const [existingAssignment] = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, contentAdminRole.id),
          eq(userRoles.isActive, true)
        )
      );

    if (existingAssignment) {
      console.log(`User ${userId} already has content_admin role`);
      return;
    }

    await db.insert(userRoles).values({
      userId,
      roleId: contentAdminRole.id,
      assignedBy: assignedBy || userId,
      assignedReason: 'Default admin role assignment',
      isActive: true,
    });

    console.log(`✓ Assigned content_admin role to user ${userId}`);
  } catch (error) {
    console.error(`Failed to assign default admin role to ${userId}:`, error);
  }
}
