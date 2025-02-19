const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function checkAndInitializeDB() {
  const client = new Client({
    connectionString: process.env.PGSQL_URL,
  });

  try {
    await client.connect();

    const res = await client.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
    );
    const tableCount = parseInt(res.rows[0].count, 10);

    if (tableCount === 0) {
      console.log("Init DB...");

      const sqlFilePath = path.join(__dirname, 'init.sql');
      const fileContent = fs.readFileSync(sqlFilePath, 'utf8');

      const queries = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('--'));

      const deferredQueries = [];

      for (const query of queries) {
        try {
          await client.query(query);
        } catch (err) {
          if (err.code === '42P01' && query.toUpperCase().startsWith('CREATE INDEX')) {
            deferredQueries.push(query);
          } else {
            throw err;
          }
        }
      }

      if (deferredQueries.length > 0) {
        for (const deferredQuery of deferredQueries) {
          await client.query(deferredQuery);
        }
      }

      console.log("Finished initializing database.");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAndInitializeDB();
