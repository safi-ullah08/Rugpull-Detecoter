const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { makeATrade } = require("./trade.js");
const dbPath = path.resolve(__dirname, "./db/db_clean_launched.sqlite"); // Path to your SQLite database
const selectQuery = "SELECT * FROM tokens WHERE postion = 0;"; // Your SQL query
const updateQuery = "UPDATE tokens SET postion = 1 WHERE tokenAddress = ?;"; // Update query to mark entries as read

const db_positions = new sqlite3.Database("./db/db_positions.sqlite");
const db_clean = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(`Error opening database: ${err.message}`);
    return;
  }

  console.log(`Connected to the SQLite database at ${dbPath}`);
});
let lock = {
  mutex: false,
  name: "",
  count: 0,
};

async function takeAPosition(data) {
  let tradeData = data;
  console.log("ACCESS REQUEST ", data.name);
  console.log("MUTEX LOCKED FOR ", lock.name, lock.mutex);

  console.log("ACCESS GRANTED TO ", data.name);
  try {
    if (await makeATrade(tradeData.address)) {
      await insertDataToDB(tradeData);
      lock.mutex = false;
      lock.count = 0;
      lock.name = "";
      console.log("TRADE SUCCESSFUL");
      return true;
    } else {
      lock.count++;
      if (lock.count == 2) {
        lock.mutex = false;
        lock.count = 0;
        lock.name = "";
      }
      console.log("TRADE FAILED", lock.count);
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}
async function insertDataToDB(data) {
  console.log("data insterted data: ", data);
  return new Promise((resolve, reject) => {
    db_positions.run(
      `CREATE TABLE IF NOT EXISTS positions (
        name TEXT,
        address TEXT UNIQUE,
        entry TEXT,
        timestamp INTEGER,
        sent BOOLEAN
      )`,
      (err) => {
        if (err) {
          reject(err);
        }
        const checkSql = "SELECT * FROM positions WHERE address = ?";
        db_positions.get(checkSql, [data.address], (err, row) => {
          if (err) {
            reject("Error checking if address exists in SQLite:", err);
          } else if (!row) {
            const insertSql = `INSERT INTO positions (name, address, entry, timestamp,sent) VALUES (?, ?, ?, ?,?)`;
            db_positions.run(
              insertSql,
              [data.name, data.address, data.entry, data.timestamp, data.sent],
              (err) => {
                if (err) {
                  reject("Error inserting data into SQLite:", err);
                } else {
                  resolve();
                }
              }
            );
          } else {
            resolve();
            console.log(`Address ${data.address} already exists in SQLite`);
          }
        });
      }
    );
  });
}

function readAndUpdateSqlite() {
  const fetchDataAndUpdate = () => {
    return new Promise((resolve, reject) => {
      const positions = {
        name: "",
        address: "",
        entry: "",
        timestamp: "",
        sent: false,
      };
      db_clean.serialize(() => {
        db_clean.all(selectQuery, [], async (err, rows) => {
          if (err) {
            console.error(`Error executing select query: ${err.message}`);
            reject(err);
            return;
          }

          console.log(`Results at ${new Date().toLocaleString()}:`);

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            console.log(row);

            positions.name = row.name;
            positions.address = row.tokenAddress;
            positions.entry = new Date().toLocaleString();
            positions.timestamp = row.timestamp;
            if (!lock.mutex) {
              lock.mutex = true;
              lock.name = positions.name;
            }
            console.log("Mutex is set for", lock.name);

            // Call the takeAPosition function
            if (await takeAPosition(positions)) {
              console.log("Sent");
              db_clean.run(updateQuery, [row.tokenAddress], (err) => {
                if (err) {
                  console.error(
                    `Error executing update query for id ${row.name}: ${err.message}`
                  );
                } else {
                  console.log(`Entry with id ${row.name} marked as read.`);
                }
              });
            } else {
              console.log("Not sent");
            }
          }
        });
      });
    });
  };

  setInterval(fetchDataAndUpdate, 10000);

  // Close the database connection when the process is terminated
  process.on("SIGINT", () => {
    db_clean.close((err) => {
      if (err) {
        console.error(`Error closing database: ${err.message}`);
      } else {
        console.log("Database connection closed.");
      }
      process.exit(0);
    });
  });
}

readAndUpdateSqlite();
