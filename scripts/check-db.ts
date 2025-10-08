import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';

async function checkDatabase() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Check what tables exist
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('📊 Existing tables in database:');
    result.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    if (result.length === 0) {
      console.log('  (empty - no tables yet)');
    }
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

checkDatabase();
