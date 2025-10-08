#!/usr/bin/env tsx
/**
 * Set a user as admin by email address
 * Usage: npx tsx scripts/set-admin.ts <email>
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function setAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx tsx scripts/set-admin.ts <email>');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Looking for user: ${email}...`);

    // Find user by email
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userList.length === 0) {
      console.error(`\n❌ User not found: ${email}`);
      console.log('\n💡 The user must sign in at least once before being made an admin.');
      console.log('   Alternatively, add their email to ADMIN_EMAILS environment variable.');
      process.exit(1);
    }

    const user = userList[0];

    if (user.isAdmin) {
      console.log(`\n✅ ${email} is already an admin!`);
      process.exit(0);
    }

    // Update user to admin
    await db
      .update(users)
      .set({
        isAdmin: true,
        updatedAt: new Date()
      })
      .where(eq(users.email, email));

    console.log(`\n✅ Successfully set ${email} as admin!`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

setAdmin();
