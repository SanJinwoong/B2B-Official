const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nduobxgymxsollmefojc:newshunwooart@aws-1-us-west-2.pooler.supabase.com:6543/postgres?uselibpqcompat=true&sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='RFQQuote' and column_name='supplierId';
    `);
    
    if (res.rows.length === 0) {
      await client.query(`ALTER TABLE "RFQQuote" ADD COLUMN "supplierId" INTEGER;`);
      console.log('Column supplierId added successfully to RFQQuote');
    } else {
      console.log('Column already exists');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
