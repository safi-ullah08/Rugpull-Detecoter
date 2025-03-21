const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const selectQuery = "SELECT * FROM positions WHERE sent = 0;"; // Your SQL query
const db_positions = new sqlite3.Database("./db/db_positions.sqlite");
const updateQuery = "UPDATE positions SET sent = 1 WHERE address = ?;"; // Update query to mark entries as read
const axios = require("axios");

async function sendMessage(data) {
  try {
    message = `name: ${data.name}\n address: ${data.address}\n entry: ${data.entry}\n timestamp: ${data.timestamp}\n url: https://dexscreener.com/base/${data.address}?maker=0xB1fd45010bCCd32F304A1b707D0B188a2369436e`;
    await axios.post("http://127.0.0.1:5000/", message);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function readAndUpdateSqlite() {
  const fetchDataAndUpdate = () => {
    return new Promise((resolve, reject) => {
      db_positions.serialize(() => {
        db_positions.all(selectQuery, [], async (err, rows) => {
          if (err) {
            console.error(`Error executing select query: ${err.message}`);
            reject(err);
            return;
          }

          console.log(`Results at ${new Date().toLocaleString()}:`);

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            console.log(row, rows.length);

            // Call the takeAPosition function
            if (await sendMessage(row)) {
              console.log("Sent");
              db_positions.run(updateQuery, [row.address], (err) => {
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

  setInterval(fetchDataAndUpdate, 1000);

  // Close the database connection when the process is terminated
  process.on("SIGINT", () => {
    db_positions.close((err) => {
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
