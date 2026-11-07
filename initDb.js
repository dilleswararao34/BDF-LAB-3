const path = require("path");
const fs = require("fs");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = process.env.DB_PATH || path.join(__dirname, "bookStore.db");

// 10 Sample books with varied titles, authors, and prices for testing
const SAMPLE_BOOKS = [
  {
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    price: 450,
  },
  {
    title: "Harry Potter and the Chamber of Secrets",
    author: "J.K. Rowling",
    price: 500,
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    price: 350,
  },
  {
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    price: 850,
  },
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    price: 650,
  },
  {
    title: "The Pragmatic Programmer",
    author: "David Thomas",
    price: 700,
  },
  {
    title: "JavaScript: The Good Parts",
    author: "Douglas Crockford",
    price: 300,
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    price: 400,
  },
  {
    title: "Deep Work",
    author: "Cal Newport",
    price: 380,
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    price: 280,
  },
];

// Helper to open DB connection
async function getDbConnection() {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

// Function to initialize schema and seed sample data if empty
async function initializeDatabase(dbInstance = null) {
  const db = dbInstance || (await getDbConnection());

  // 1. Create table if not exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL
    );
  `);

  // 2. Check if table is empty
  const countRow = await db.get("SELECT COUNT(*) AS count FROM books");

  if (countRow.count === 0) {
    console.log("Database table 'books' is empty. Seeding sample books...");

    const insertQuery = `
      INSERT INTO books (title, author, price)
      VALUES (?, ?, ?)
    `;

    for (const book of SAMPLE_BOOKS) {
      await db.run(insertQuery, [book.title, book.author, book.price]);
    }

    console.log(`Successfully seeded ${SAMPLE_BOOKS.length} sample books.`);
  } else {
    console.log(`Table 'books' already contains ${countRow.count} records. Skipping seed.`);
  }

  return db;
}

// Standalone execution support: node initDb.js
if (require.main === module) {
  (async () => {
    try {
      console.log(`Initializing SQLite database at: ${dbPath}`);
      const db = await initializeDatabase();
      await db.close();
      console.log("Database initialization completed successfully.");
    } catch (error) {
      console.error("Error during database initialization:", error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  getDbConnection,
  initializeDatabase,
  SAMPLE_BOOKS,
  dbPath,
};

