# Postman Test Screenshots Directory

This directory stores the visual verification screenshots for the BDF Lab 3 submission.

## Captured Screenshots (15/15)

| # | Screenshot Link | Test Description | Expected Status |
| :-: | :--- | :--- | :---: |
| 01 | [`01_get_all_books.png.png`](./01_get_all_books.png.png) | GET `/books/` – Retrieve all books from SQLite database | `200 OK` |
| 02 | [`02_search_books.png.png`](./02_search_books.png.png) | GET `/books/?search_q=harry` – Search books by partial title via SQL `LIKE` | `200 OK` |
| 03 | [`03_sort_ascending.png.png`](./03_sort_ascending.png.png) | GET `/books/?order_by=price&order=ASC` – Sort books ascending by price | `200 OK` |
| 04 | [`04_sort_descending.png.png`](./04_sort_descending.png.png) | GET `/books/?order_by=price&order=DESC` – Sort books descending by price | `200 OK` |
| 05 | [`05_pagination.png.png`](./05_pagination.png.png) | GET `/books/?limit=3&offset=3` – Pagination using limit and offset | `200 OK` |
| 06 | [`06_price_filter.png.png`](./06_price_filter.png.png) | GET `/books/?min_price=100&max_price=500` – Filter by price range | `200 OK` |
| 07 | [`07_get_single_book.png.png`](./07_get_single_book.png.png) | GET `/books/1/` – Retrieve a single book record by ID | `200 OK` |
| 08 | [`08_add_book.png.png`](./08_add_book.png.png) | POST `/books/` – Add a new book with valid payload | `201 Created` |
| 09 | [`09_update_book.png.png`](./09_update_book.png.png) | PUT `/books/1/` – Update an existing book record by ID | `200 OK` |
| 10 | [`10_delete_book.png.png`](./10_delete_book.png.png) | DELETE `/books/10/` – Delete a book record by ID | `200 OK` |
| 11 | [`11_validation_missing_title.png.png`](./11_validation_missing_title.png.png) | POST `/books/` – Validation rejection for missing title | `400 Bad Request` |
| 12 | [`12_validation_missing_author.png.png`](./12_validation_missing_author.png.png) | POST `/books/` – Validation rejection for missing author | `400 Bad Request` |
| 13 | [`13_validation_missing_price.png.png`](./13_validation_missing_price.png.png) | POST `/books/` – Validation rejection for missing price | `400 Bad Request` |
| 14 | [`14_validation_invalid_price.png.png`](./14_validation_invalid_price.png.png) | POST `/books/` – Validation rejection for non-numeric/negative price | `400 Bad Request` |
| 15 | [`15_book_not_found.png.png`](./15_book_not_found.png.png) | GET `/books/99999/` – Error response for nonexistent book ID | `404 Not Found` |
