const express = require("express");
const path = require("path");
const fs = require("fs");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Port and DB configuration (supports environment variables for test/production)
const getPort = () => process.env.PORT || 3000;
const getDbPath = () => process.env.DB_PATH || path.join(__dirname, "bookStore.db");

let db = null;

// Initial sample books (seeded automatically if the database table is empty)
const INITIAL_BOOKS = [
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

/**
 * Initializes the SQLite database connection, ensures the books table exists,
 * seeds sample data if the table is empty, and starts the Express server.
 */
const initializeDBAndServer = async () => {
  try {
    const activePort = getPort();
    const activeDbPath = getDbPath();

    // Ensure the directory for the database file exists
    const dbDir = path.dirname(activeDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Connect to SQLite database
    db = await open({
      filename: activeDbPath,
      driver: sqlite3.Database,
    });

    console.log(`Connected to SQLite database at: ${activeDbPath}`);

    // Create the 'books' table if it does not already exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL
      );
    `);

    // Check if books table already has records
    const countResult = await db.get("SELECT COUNT(*) AS count FROM books");

    // Insert sample books only when the table is empty
    if (countResult.count === 0) {
      console.log("Seeding sample books into empty database...");
      const insertQuery = `
        INSERT INTO books (title, author, price)
        VALUES (?, ?, ?)
      `;

      for (const book of INITIAL_BOOKS) {
        await db.run(insertQuery, [book.title, book.author, book.price]);
      }

      console.log(`Seeded ${INITIAL_BOOKS.length} sample books successfully.`);
    }

    // Start Express HTTP server
    return new Promise((resolve) => {
      const server = app.listen(activePort, () => {
        console.log(`Server is running at http://localhost:${activePort}`);
        resolve(server);
      });
    });
  } catch (error) {
    console.error(`Database / Server initialization error: ${error.message}`);
    process.exit(1);
  }
};

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Root Route: Health check and API overview
 * Method: GET /
 */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to BDF Lab 3 Book Store API",
    status: "Online",
    endpoints: {
      "GET /books/":
        "Retrieve books with optional query parameters (search_q, order_by, order, limit, offset, min_price, max_price)",
      "GET /books/:bookId/": "Retrieve a single book by ID",
      "POST /books/": "Add a new book (requires title, author, numeric price)",
      "PUT /books/:bookId/": "Update an existing book by ID",
      "DELETE /books/:bookId/": "Delete a book by ID",
    },
  });
});

/**
 * Requirement A, B & C: GET /books/
 * Retrieves books with search, sorting, pagination, and price-range filtering.
 *
 * Query parameters supported:
 * - search_q: Partial search on title using SQL LIKE (default: "")
 * - order_by: Sorting column: id, title, author, price (default: "id")
 * - order: Sort direction: ASC, DESC (default: "ASC")
 * - limit: Number of books to return (default: 10)
 * - offset: Number of books to skip (default: 0)
 * - min_price: Minimum price filter (optional)
 * - max_price: Maximum price filter (optional)
 */
app.get("/books/", async (req, res) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = "10",
      offset = "0",
      min_price,
      max_price,
    } = req.query;

    // 1. Validate 'order_by' column against safe whitelist
    const allowedColumns = ["id", "title", "author", "price"];
    const sanitizedOrderBy = order_by.toLowerCase();
    if (!allowedColumns.includes(sanitizedOrderBy)) {
      return res.status(400).json({
        message: `Invalid order_by column. Allowed columns are: ${allowedColumns.join(", ")}`,
      });
    }

    // 2. Validate 'order' direction
    const sanitizedOrder = order.toUpperCase();
    if (sanitizedOrder !== "ASC" && sanitizedOrder !== "DESC") {
      return res.status(400).json({
        message: "Invalid order value. Allowed values are: ASC, DESC",
      });
    }

    // 3. Validate pagination parameters (limit and offset)
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum <= 0) {
      return res.status(400).json({
        message: "Invalid limit value. Limit must be a positive integer",
      });
    }

    const offsetNum = Number(offset);
    if (!Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        message: "Invalid offset value. Offset must be a non-negative integer",
      });
    }

    // 4. Validate price-range filters if provided
    let parsedMinPrice = null;
    let parsedMaxPrice = null;

    if (min_price !== undefined) {
      parsedMinPrice = Number(min_price);
      if (isNaN(parsedMinPrice) || parsedMinPrice < 0) {
        return res.status(400).json({
          message: "Invalid min_price value. It must be a non-negative number",
        });
      }
    }

    if (max_price !== undefined) {
      parsedMaxPrice = Number(max_price);
      if (isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        return res.status(400).json({
          message: "Invalid max_price value. It must be a non-negative number",
        });
      }
    }

    if (
      parsedMinPrice !== null &&
      parsedMaxPrice !== null &&
      parsedMinPrice > parsedMaxPrice
    ) {
      return res.status(400).json({
        message: "min_price cannot be greater than max_price",
      });
    }

    // 5. Build parameterized query dynamically
    const conditions = [];
    const params = [];

    // Search by partial title using SQL LIKE with '?' placeholder
    if (search_q && search_q.trim() !== "") {
      conditions.push("title LIKE ?");
      params.push(`%${search_q.trim()}%`);
    }

    // Price-range filtering using SQL BETWEEN or comparison operators
    if (parsedMinPrice !== null && parsedMaxPrice !== null) {
      conditions.push("price BETWEEN ? AND ?");
      params.push(parsedMinPrice, parsedMaxPrice);
    } else if (parsedMinPrice !== null) {
      conditions.push("price >= ?");
      params.push(parsedMinPrice);
    } else if (parsedMaxPrice !== null) {
      conditions.push("price <= ?");
      params.push(parsedMaxPrice);
    }

    // Construct SQL string with safe interpolation of validated columns
    let selectQuery = "SELECT * FROM books";
    if (conditions.length > 0) {
      selectQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Append validated sorting and pagination placeholders
    selectQuery += ` ORDER BY ${sanitizedOrderBy} ${sanitizedOrder} LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    // Execute query using parameterized inputs
    const books = await db.all(selectQuery, params);
    return res.status(200).json(books);
  } catch (error) {
    console.error("Error executing GET /books/:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Requirement A & E: GET /books/:bookId/
 * Retrieves a single book by its ID.
 */
app.get("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;

    // Validate that bookId is a positive integer
    const idNum = Number(bookId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        message: "Invalid book ID. Book ID must be a positive integer",
      });
    }

    // Query the database using parameterized query
    const selectBookQuery = "SELECT * FROM books WHERE id = ?";
    const book = await db.get(selectBookQuery, [idNum]);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.error("Error executing GET /books/:bookId/:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Requirement A, D & E: POST /books/
 * Creates a new book record with body validation.
 *
 * Rejects:
 * - Missing title or empty string
 * - Missing author or empty string
 * - Missing price
 * - Non-numeric or negative price
 */
app.post("/books/", async (req, res) => {
  try {
    const { title, author, price } = req.body;

    // 1. Validate title
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        message: "Title is required and must be a non-empty string",
      });
    }

    // 2. Validate author
    if (!author || typeof author !== "string" || author.trim() === "") {
      return res.status(400).json({
        message: "Author is required and must be a non-empty string",
      });
    }

    // 3. Validate price existence
    if (price === undefined || price === null || price === "") {
      return res.status(400).json({
        message: "Price is required",
      });
    }

    // 4. Validate that price is numeric and non-negative
    const parsedPrice = Number(price);
    if (typeof price === "boolean" || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid positive number",
      });
    }

    // Insert new book record using parameterized placeholders
    const insertBookQuery = `
      INSERT INTO books (title, author, price)
      VALUES (?, ?, ?)
    `;

    const result = await db.run(insertBookQuery, [
      title.trim(),
      author.trim(),
      parsedPrice,
    ]);

    return res.status(201).json({
      message: "Book created successfully",
      book: {
        id: result.lastID,
        title: title.trim(),
        author: author.trim(),
        price: parsedPrice,
      },
    });
  } catch (error) {
    console.error("Error executing POST /books/:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Requirement A & E: PUT /books/:bookId/
 * Updates an existing book record.
 */
app.put("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;

    // Validate that bookId is a positive integer
    const idNum = Number(bookId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        message: "Invalid book ID. Book ID must be a positive integer",
      });
    }

    // Check if the book exists
    const existingBook = await db.get("SELECT * FROM books WHERE id = ?", [
      idNum,
    ]);

    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    const { title, author, price } = req.body;

    // Validate fields if provided for updating
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        message: "Title is required and must be a non-empty string",
      });
    }

    if (!author || typeof author !== "string" || author.trim() === "") {
      return res.status(400).json({
        message: "Author is required and must be a non-empty string",
      });
    }

    if (price === undefined || price === null || price === "") {
      return res.status(400).json({
        message: "Price is required",
      });
    }

    const parsedPrice = Number(price);
    if (typeof price === "boolean" || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid positive number",
      });
    }

    // Parameterized update query
    const updateBookQuery = `
      UPDATE books
      SET title = ?, author = ?, price = ?
      WHERE id = ?
    `;

    await db.run(updateBookQuery, [
      title.trim(),
      author.trim(),
      parsedPrice,
      idNum,
    ]);

    return res.status(200).json({
      message: "Book updated successfully",
      book: {
        id: idNum,
        title: title.trim(),
        author: author.trim(),
        price: parsedPrice,
      },
    });
  } catch (error) {
    console.error("Error executing PUT /books/:bookId/:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Requirement A & E: DELETE /books/:bookId/
 * Deletes a book record by ID.
 */
app.delete("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;

    // Validate that bookId is a positive integer
    const idNum = Number(bookId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        message: "Invalid book ID. Book ID must be a positive integer",
      });
    }

    // Check if the book exists
    const existingBook = await db.get("SELECT * FROM books WHERE id = ?", [
      idNum,
    ]);

    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Parameterized delete query
    const deleteBookQuery = "DELETE FROM books WHERE id = ?";
    await db.run(deleteBookQuery, [idNum]);

    return res.status(200).json({
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Error executing DELETE /books/:bookId/:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global internal error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Exception:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

// Closes the SQLite database connection gracefully
const closeDB = async () => {
  if (db) {
    await db.close();
    db = null;
  }
};

// Only start the server automatically if run directly
if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer, closeDB };
