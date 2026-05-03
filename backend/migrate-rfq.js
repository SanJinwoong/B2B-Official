const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nduobxgymxsollmefojc:newshunwooart@aws-1-us-west-2.pooler.supabase.com:6543/postgres?uselibpqcompat=true&sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');
    
    // Check if column exists first
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='RFQ' and column_name='images';
    `);
    
    if (res.rows.length === 0) {
      console.log('Adding columns category and images to RFQ...');
      await client.query(`
        ALTER TABLE "RFQ" 
        ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general',
        ADD COLUMN "images" TEXT NOT NULL DEFAULT '[]';
      `);
      console.log('Columns added successfully');
    } else {
      console.log('Columns already exist');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
