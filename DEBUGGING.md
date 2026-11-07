# BDF Lab 3 – Debugging Exercise Guide

This document covers four of the most frequent backend engineering errors encountered during Express.js and SQLite development. For each error, this guide details:
1. **The Error Signature (Terminal Output / Stack Trace)**
2. **Root Cause Analysis**
3. **Reproduction Code (Bad vs. Good)**
4. **Step-by-Step Fix**
5. **Viva / Interview Explanation**

---

## 1. Port Conflict – `EADDRINUSE`

### What the Error Looks Like
```text
node:events:497
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1904:16)
    at listenInCluster (node:net:1961:12)
    at Server.listen (node:net:2063:7)
    at Function.listen (C:\Users\...\BDF-LAB-3\node_modules\express\lib\application.js:635:24)
    at initializeDBAndServer (C:\Users\...\BDF-LAB-3\index.js:98:20)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1940:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21) {
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '::',
  port: 3000
}
```

### Cause
The operating system only allows one process to listen on a given network port and IP address at any one time. This error occurs when:
- An earlier instance of the Node.js server is still running in the background or another terminal window.
- Another software application (such as Apache, IIS, or Docker) is already using port `3000`.
- The server crashed improperly without releasing the port socket.

### How to Reproduce It
1. Start the server in terminal 1:
   ```bash
   node index.js
   ```
2. Open a second terminal window and run:
   ```bash
   node index.js
   ```
3. Terminal 2 immediately crashes with `Error: listen EADDRINUSE: address already in use :::3000`.

### Solution & Fix

#### Option A: Terminate the Conflicting Process
Identify the process ID (PID) occupying the port and terminate it:

**On Windows (PowerShell):**
```powershell
# 1. Find the PID using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess

# 2. Kill the process by PID
Stop-Process -Id <PID> -Force
```

**On Windows (Command Prompt):**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**On Linux / macOS:**
```bash
lsof -i :3000
kill -9 <PID>
```

#### Option B: Use Dynamic Port Configuration (Best Practice)
Never hardcode port numbers. Allow the port to be overridden via environment variables:

```javascript
// index.js
// Reads from process.env.PORT first; defaults to 3000 if unset
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
```

Now you can start the application on any free port without modifying code:
```powershell
$env:PORT=5000; node index.js
```

---

## 2. Wrong Import Path – `MODULE_NOT_FOUND`

### What the Error Looks Like
```text
node:internal/modules/cjs/loader:1252
  throw err;
  ^

Error: Cannot find module './initdb.js'
Require stack:
- C:\Users\...\BDF-LAB-3\index.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Module._load (node:internal/modules/cjs/loader:1075:27)
    at Module.require (node:internal/modules/cjs/loader:1312:19)
    at require (node:internal/modules/helpers:130:18)
    at Object.<anonymous> (C:\Users\...\BDF-LAB-3\index.js:5:20)
    at Module._compile (node:internal/modules/cjs/loader:1546:14) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ 'C:\\Users\\...\\BDF-LAB-3\\index.js' ]
}
```

### Cause
Node.js CommonJS module resolver searches for modules using strict path rules:
1. **Missing Relative Specifier (`./` or `../`):** Writing `require('initDb')` makes Node look inside the global `node_modules` folder rather than the current project directory.
2. **Case Sensitivity:** Windows is case-insensitive, but Linux/Render and git repositories are case-sensitive. Requiring `./initdb` instead of `./initDb` causes immediate crashes when deployed to Linux cloud hosts.
3. **Typo in File Extension or Name:** Specifying `./models/book` when the file is `./model/books.js`.

### How to Reproduce It
```javascript
// ❌ INCORRECT: Missing relative path marker './'
const { initializeDatabase } = require("initDb");

// ❌ INCORRECT: Case-mismatch (fails in Linux/Render environments)
const { initializeDatabase } = require("./initdb.js");
```

### Solution & Fix
```javascript
// ✅ CORRECT: Explicit relative path with exact casing
const { initializeDatabase } = require("./initDb.js");

// ✅ For third-party packages installed in node_modules:
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
```

---

## 3. Table-Name Typo – `no such table`

### What the Error Looks Like
```text
[Error: SQLITE_ERROR: no such table: book] {
  errno: 1,
  code: 'SQLITE_ERROR'
}
```
Or in an HTTP response:
```json
{
  "message": "Internal server error"
}
```
With server terminal printing:
```text
Error executing GET /books/: SQLITE_ERROR: no such table: book
```

### Cause
This error occurs when an SQL query attempts to query, insert, update, or delete records from a table name that does not exist in the SQLite database file:
- **Plural vs. Singular Confusion:** Creating the table as `books` (plural), but querying `SELECT * FROM book` (singular).
- **Spelling Typo:** Querying `SELECT * FROM boks`.
- **Database Mismatch:** Connecting to a blank or different `.db` file where migrations or schema creation scripts have not yet been executed.

### How to Reproduce It
```javascript
// Table created as 'books':
await db.run(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    price INTEGER NOT NULL
  );
`);

// ❌ INCORRECT: Querying 'book' instead of 'books'
app.get("/books/", async (req, res) => {
  const books = await db.all("SELECT * FROM book"); // Throws SQLITE_ERROR: no such table: book
  res.json(books);
});
```

### Solution & Fix

1. **Verify Table Names in SQLite:**
   Run an SQL query against `sqlite_master` to inspect existing tables:
   ```javascript
   const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
   console.log("Existing tables:", tables);
   ```

2. **Align Table Names Consistently:**
   Ensure table creation and all CRUD statements use the exact same table identifier:
   ```javascript
   // ✅ CORRECT: Consistent table name 'books' across all queries
   await db.run("CREATE TABLE IF NOT EXISTS books (...)");
   
   // Select
   const books = await db.all("SELECT * FROM books");
   
   // Insert
   await db.run("INSERT INTO books (title, author, price) VALUES (?, ?, ?)", [title, author, price]);
   
   // Update
   await db.run("UPDATE books SET title = ? WHERE id = ?", [title, id]);
   
   // Delete
   await db.run("DELETE FROM books WHERE id = ?", [id]);
   ```

---

## 4. Missing `await` with Asynchronous Database Calls

### What the Bug Looks Like

**Case A: Returning Empty Response `{}` instead of Data**
When making a GET request to `/books/`:
- **Expected response:**
  ```json
  [
    { "id": 1, "title": "Harry Potter", "author": "J.K. Rowling", "price": 450 }
  ]
  ```
- **Actual response when `await` is missing:**
  ```json
  {}
  ```
Because `JSON.stringify(new Promise(...))` serializes an unresolved JavaScript Promise to `{}`!

**Case B: Undefined `result.lastID` on POST**
When creating a book:
```javascript
const result = db.run(insertQuery, [title, author, price]); // Missing await
console.log(result.lastID); // Prints: undefined
res.status(201).json({ id: result.lastID }); // Client receives: { "id": null }
```

**Case C: Silent Failures and Race Conditions**
The HTTP response is sent before the database operation finishes. If the query fails, the client already received a `200 OK`, while the server throws an unhandled promise rejection in the background.

### Cause
In the `sqlite` driver, all operations (`db.all()`, `db.get()`, `db.run()`) are **asynchronous** and return a JavaScript `Promise`. If you omit the `await` keyword, JavaScript does not wait for the SQLite driver to execute the disk I/O; it immediately passes the pending `Promise` object to the next line.

### How to Reproduce It
```javascript
// ❌ INCORRECT: Missing await before db.all()
app.get("/books/", async (req, res) => {
  const books = db.all("SELECT * FROM books"); // Returns Promise { <pending> }
  console.log(books);                          // Output: Promise { <pending> }
  res.status(200).json(books);                 // Sends {} to client
});
```

### Solution & Fix

Always pair `async` route handlers with `await` on every database call, and wrap them in `try...catch` blocks:

```javascript
// ✅ CORRECT: Async handler with await and error handling
app.get("/books/", async (req, res) => {
  try {
    const books = await db.all("SELECT * FROM books"); // Resolves array of objects
    console.log(`Fetched ${books.length} books`);
    return res.status(200).json(books);
  } catch (error) {
    console.error("Database query failed:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});
```

---

## Quick Reference Summary for College Viva

| Error | Typical Symptom | Root Cause | Instant Fix |
| :--- | :--- | :--- | :--- |
| **`EADDRINUSE`** | Crash: `address already in use :::3000` | Port already claimed by another active process | Kill process via PID or change port via `PORT=4000` |
| **`MODULE_NOT_FOUND`** | Crash: `Cannot find module './...'` | Missing `./`, wrong filename, or casing mismatch | Verify exact file path and use `./` for local modules |
| **`SQLITE_ERROR: no such table`** | 500 error: `no such table: book` | Schema created `books` (plural), query used `book` (singular) | Synchronize table name between `CREATE TABLE` and SQL queries |
| **Missing `await`** | Response returns `{}` or `undefined` IDs | Asynchronous Promise serialized before resolving | Add `await` before all `db.all()`, `db.get()`, `db.run()` calls |

