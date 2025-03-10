const { Client } = require("pg");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

async function insertInitialData(client, data) {
  if (data.warn_type && data.warn_type.length > 0) {
    const warnTypeValues = data.warn_type
      .map(w => `(${w.id}, '${w.name}', '${w.description}')`)
      .join(',');
    await client.query(`
      INSERT INTO public.warn_type (id, name, description) 
      VALUES ${warnTypeValues};
    `);
  }

  if (data.config && data.config.length > 0) {
    const configValues = data.config
      .map(c => `(${c.id}, ${c.app_open}, ${c.send_wlc_msg})`)
      .join(',');
    await client.query(`
      INSERT INTO public.config (id, app_open, send_wlc_msg) 
      VALUES ${configValues};
    `);
  }
}

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
      console.log("Database is empty. Running prisma db push...");
      
      const dbPushPath = path.join(__dirname, "../docker/db-push.sh");
      try {
        execSync(`bash ${dbPushPath}`, { stdio: 'inherit' });
        console.log("Database schema created. Inserting initial data...");

        const queriesPath = path.join(__dirname, "init.json");
        const initialData = JSON.parse(fs.readFileSync(queriesPath, 'utf8'));
        
        await insertInitialData(client, initialData);
        console.log("Initial data inserted successfully.");
      } catch (error) {
        console.error("Error during database initialization:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAndInitializeDB();