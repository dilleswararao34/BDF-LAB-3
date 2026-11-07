/**
 * testEndpoints.js
 * Comprehensive automated test suite for BDF Lab 3.
 * Tests all successful and failure cases required by the assignment.
 */

const fs = require("fs");
const { app, initializeDBAndServer, closeDB } = require("./index");

const TEST_PORT = 3005;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Helper function to print test results cleanly
let passedCount = 0;
let failedCount = 0;

function assertTest(testName, condition, details = "") {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${testName} ${details ? "- " + details : ""}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("============================================================");
  console.log("BDF Lab 3: Automated Endpoint Verification Suite");
  console.log("============================================================\n");

  process.env.PORT = TEST_PORT;
  process.env.DB_PATH = "./test_bookStore.db";

  // Start the server
  const server = await initializeDBAndServer();

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Root & Health Check
    // ------------------------------------------------------------------------
    console.log("\n[TEST GROUP 1: Health & Root Endpoint]");
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootData = await rootRes.json();
    assertTest(
      "GET / returns 200 OK and welcome status",
      rootRes.status === 200 && rootData.status === "Online",
      `Status: ${rootRes.status}`
    );

    // ------------------------------------------------------------------------
    // SECTION 2: Successful Cases
    // ------------------------------------------------------------------------
    console.log("\n[TEST GROUP 2: Successful Scenarios]");

    // 1. Get all books
    const allRes = await fetch(`${BASE_URL}/books/`);
    const allData = await allRes.json();
    assertTest(
      "1. GET /books/ returns 200 OK and an array of books",
      allRes.status === 200 && Array.isArray(allData) && allData.length > 0,
      `Length: ${allData.length}`
    );

    // 2. Search by partial title (search_q=harry)
    const searchRes = await fetch(`${BASE_URL}/books/?search_q=harry`);
    const searchData = await searchRes.json();
    const allContainHarry = searchData.every((b) =>
      b.title.toLowerCase().includes("harry")
    );
    assertTest(
      "2. GET /books/?search_q=harry filters books with 'harry' in title",
      searchRes.status === 200 && searchData.length >= 2 && allContainHarry,
      `Matched: ${searchData.length} books`
    );

    // 3. Sort ascending and descending
    const sortAscRes = await fetch(
      `${BASE_URL}/books/?order_by=price&order=ASC`
    );
    const sortAscData = await sortAscRes.json();
    const isAsc = sortAscData.every(
      (b, i, arr) => i === 0 || arr[i - 1].price <= b.price
    );
    assertTest(
      "3a. GET /books/?order_by=price&order=ASC sorts prices ascending",
      sortAscRes.status === 200 && isAsc,
      `First price: ${sortAscData[0]?.price}, Last price: ${sortAscData[sortAscData.length - 1]?.price}`
    );

    const sortDescRes = await fetch(
      `${BASE_URL}/books/?order_by=price&order=DESC`
    );
    const sortDescData = await sortDescRes.json();
    const isDesc = sortDescData.every(
      (b, i, arr) => i === 0 || arr[i - 1].price >= b.price
    );
    assertTest(
      "3b. GET /books/?order_by=price&order=DESC sorts prices descending",
      sortDescRes.status === 200 && isDesc,
      `First price: ${sortDescData[0]?.price}, Last price: ${sortDescData[sortDescData.length - 1]?.price}`
    );

    // 4. Limit and offset pagination
    const limitOffsetRes1 = await fetch(
      `${BASE_URL}/books/?limit=3&offset=0&order_by=id&order=ASC`
    );
    const limitOffsetData1 = await limitOffsetRes1.json();
    const limitOffsetRes2 = await fetch(
      `${BASE_URL}/books/?limit=3&offset=3&order_by=id&order=ASC`
    );
    const limitOffsetData2 = await limitOffsetRes2.json();

    const noOverlap =
      limitOffsetData1[limitOffsetData1.length - 1].id < limitOffsetData2[0].id;
    assertTest(
      "4. GET /books/?limit=3&offset=0 vs offset=3 provides correct pagination",
      limitOffsetRes1.status === 200 &&
        limitOffsetData1.length === 3 &&
        limitOffsetData2.length === 3 &&
        noOverlap,
      `Page 1 IDs: [${limitOffsetData1.map((b) => b.id)}], Page 2 IDs: [${limitOffsetData2.map((b) => b.id)}]`
    );

    // 5. Price-range filtering (min_price=100&max_price=500)
    const priceRangeRes = await fetch(
      `${BASE_URL}/books/?min_price=100&max_price=500`
    );
    const priceRangeData = await priceRangeRes.json();
    const allInRange = priceRangeData.every(
      (b) => b.price >= 100 && b.price <= 500
    );
    assertTest(
      "5. GET /books/?min_price=100&max_price=500 filters prices between 100 and 500",
      priceRangeRes.status === 200 && priceRangeData.length > 0 && allInRange,
      `Count: ${priceRangeData.length}`
    );

    // 6. Combine multiple query parameters
    const combinedRes = await fetch(
      `${BASE_URL}/books/?search_q=harry&order_by=price&order=DESC&limit=5&offset=0`
    );
    const combinedData = await combinedRes.json();
    assertTest(
      "6. GET /books/?search_q=harry&order_by=price&order=DESC&limit=5&offset=0 combines all params",
      combinedRes.status === 200 &&
        combinedData.length === 2 &&
        combinedData[0].price >= combinedData[1].price,
      `Returned: ${combinedData.length} records`
    );

    // 7. Get book by ID
    const singleBookRes = await fetch(`${BASE_URL}/books/1/`);
    const singleBookData = await singleBookRes.json();
    assertTest(
      "7. GET /books/1/ returns 200 OK and single book data",
      singleBookRes.status === 200 && singleBookData.id === 1,
      `Title: ${singleBookData.title}`
    );

    // 8. Add a book (POST /books/)
    const createBookRes = await fetch(`${BASE_URL}/books/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test-Driven Development",
        author: "Kent Beck",
        price: 550,
      }),
    });
    const createBookData = await createBookRes.json();
    const createdId = createBookData.book?.id;
    assertTest(
      "8. POST /books/ creates a new book and returns 201 Created",
      createBookRes.status === 201 && createdId !== undefined,
      `Created ID: ${createdId}`
    );

    // 9. Update a book (PUT /books/:bookId/)
    const updateBookRes = await fetch(`${BASE_URL}/books/${createdId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test-Driven Development by Example (Updated)",
        author: "Kent Beck",
        price: 580,
      }),
    });
    const updateBookData = await updateBookRes.json();
    assertTest(
      "9. PUT /books/:bookId/ updates existing book and returns 200 OK",
      updateBookRes.status === 200 &&
        updateBookData.book?.title ===
          "Test-Driven Development by Example (Updated)",
      `Updated Title: ${updateBookData.book?.title}`
    );

    // 10. Delete a book (DELETE /books/:bookId/)
    const deleteBookRes = await fetch(`${BASE_URL}/books/${createdId}/`, {
      method: "DELETE",
    });
    const deleteBookData = await deleteBookRes.json();
    assertTest(
      "10. DELETE /books/:bookId/ removes book and returns 200 OK",
      deleteBookRes.status === 200 &&
        deleteBookData.message === "Book deleted successfully",
      `Message: ${deleteBookData.message}`
    );

    // ------------------------------------------------------------------------
    // SECTION 3: Failure Cases & Validation
    // ------------------------------------------------------------------------
    console.log("\n[TEST GROUP 3: Failure Cases & Input Validation]");

    // 11. POST missing title
    const missTitleRes = await fetch(`${BASE_URL}/books/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "Some Author", price: 300 }),
    });
    const missTitleData = await missTitleRes.json();
    assertTest(
      "11. POST /books/ rejects missing title with 400 Bad Request",
      missTitleRes.status === 400 && missTitleData.message.includes("Title"),
      `Message: ${missTitleData.message}`
    );

    // 12. POST missing author
    const missAuthorRes = await fetch(`${BASE_URL}/books/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Some Title", price: 300 }),
    });
    const missAuthorData = await missAuthorRes.json();
    assertTest(
      "12. POST /books/ rejects missing author with 400 Bad Request",
      missAuthorRes.status === 400 && missAuthorData.message.includes("Author"),
      `Message: ${missAuthorData.message}`
    );

    // 13. POST missing price
    const missPriceRes = await fetch(`${BASE_URL}/books/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Some Title", author: "Some Author" }),
    });
    const missPriceData = await missPriceRes.json();
    assertTest(
      "13. POST /books/ rejects missing price with 400 Bad Request",
      missPriceRes.status === 400 && missPriceData.message.includes("Price"),
      `Message: ${missPriceData.message}`
    );

    // 14. POST non-numeric price
    const nonNumericPriceRes = await fetch(`${BASE_URL}/books/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Some Title",
        author: "Some Author",
        price: "not-a-number",
      }),
    });
    const nonNumericPriceData = await nonNumericPriceRes.json();
    assertTest(
      "14. POST /books/ rejects non-numeric price with 400 Bad Request",
      nonNumericPriceRes.status === 400 &&
        nonNumericPriceData.message.includes("Price"),
      `Message: ${nonNumericPriceData.message}`
    );

    // 15. GET nonexistent book (404)
    const nonExistGetRes = await fetch(`${BASE_URL}/books/999999/`);
    const nonExistGetData = await nonExistGetRes.json();
    assertTest(
      "15. GET /books/999999/ returns 404 Not Found",
      nonExistGetRes.status === 404 &&
        nonExistGetData.message === "Book not found",
      `Status: ${nonExistGetRes.status}`
    );

    // 16. PUT nonexistent book (404)
    const nonExistPutRes = await fetch(`${BASE_URL}/books/999999/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Nonexistent",
        author: "Nobody",
        price: 500,
      }),
    });
    const nonExistPutData = await nonExistPutRes.json();
    assertTest(
      "16. PUT /books/999999/ returns 404 Not Found",
      nonExistPutRes.status === 404 &&
        nonExistPutData.message === "Book not found",
      `Status: ${nonExistPutRes.status}`
    );

    // 17. DELETE nonexistent book (404)
    const nonExistDelRes = await fetch(`${BASE_URL}/books/999999/`, {
      method: "DELETE",
    });
    const nonExistDelData = await nonExistDelRes.json();
    assertTest(
      "17. DELETE /books/999999/ returns 404 Not Found",
      nonExistDelRes.status === 404 &&
        nonExistDelData.message === "Book not found",
      `Status: ${nonExistDelRes.status}`
    );

    // 18. Invalid sorting column or order (400)
    const invalidOrderByRes = await fetch(
      `${BASE_URL}/books/?order_by=invalid_column`
    );
    const invalidOrderByData = await invalidOrderByRes.json();
    assertTest(
      "18a. GET /books/?order_by=invalid_col rejects with 400 Bad Request",
      invalidOrderByRes.status === 400 &&
        invalidOrderByData.message.includes("order_by"),
      `Message: ${invalidOrderByData.message}`
    );

    const invalidOrderRes = await fetch(`${BASE_URL}/books/?order=SIDEWAYS`);
    const invalidOrderData = await invalidOrderRes.json();
    assertTest(
      "18b. GET /books/?order=SIDEWAYS rejects with 400 Bad Request",
      invalidOrderRes.status === 400 &&
        invalidOrderData.message.includes("order"),
      `Message: ${invalidOrderData.message}`
    );

    // 19. Invalid pagination and price-range values (400)
    const invalidLimitRes = await fetch(`${BASE_URL}/books/?limit=-5`);
    const invalidLimitData = await invalidLimitRes.json();
    assertTest(
      "19a. GET /books/?limit=-5 rejects with 400 Bad Request",
      invalidLimitRes.status === 400 &&
        invalidLimitData.message.includes("limit"),
      `Message: ${invalidLimitData.message}`
    );

    const invalidOffsetRes = await fetch(`${BASE_URL}/books/?offset=-1`);
    const invalidOffsetData = await invalidOffsetRes.json();
    assertTest(
      "19b. GET /books/?offset=-1 rejects with 400 Bad Request",
      invalidOffsetRes.status === 400 &&
        invalidOffsetData.message.includes("offset"),
      `Message: ${invalidOffsetData.message}`
    );

    const invalidMinPriceRes = await fetch(`${BASE_URL}/books/?min_price=abc`);
    const invalidMinPriceData = await invalidMinPriceRes.json();
    assertTest(
      "19c. GET /books/?min_price=abc rejects with 400 Bad Request",
      invalidMinPriceRes.status === 400 &&
        invalidMinPriceData.message.includes("min_price"),
      `Message: ${invalidMinPriceData.message}`
    );

    const invertedPriceRes = await fetch(
      `${BASE_URL}/books/?min_price=500&max_price=200`
    );
    const invertedPriceData = await invertedPriceRes.json();
    assertTest(
      "19d. GET /books/?min_price=500&max_price=200 rejects with 400 Bad Request",
      invertedPriceRes.status === 400 &&
        invertedPriceData.message.includes("min_price cannot be greater"),
      `Message: ${invertedPriceData.message}`
    );

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log("\n============================================================");
    console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${failedCount}`);
    console.log("============================================================\n");

    if (failedCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution threw unhandled exception:", err);
    process.exitCode = 1;
  } finally {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (typeof closeDB === "function") {
      await closeDB();
    }
    // Clean up temporary test database files
    try {
      if (fs.existsSync("./test_bookStore.db")) {
        fs.unlinkSync("./test_bookStore.db");
      }
      if (fs.existsSync("./test_bookStore.db-journal")) {
        fs.unlinkSync("./test_bookStore.db-journal");
      }
    } catch (e) {
      // Ignored
    }
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
