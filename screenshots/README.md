# Postman Test Screenshots Directory

This directory stores the visual verification screenshots for BDF Lab 3 submission.

## Required Screenshots Checklist

| File Name | Test Description | Expected Status |
| :--- | :--- | :--- |
| `01_get_all_books.png` | GET `/books/` (Retrieve all books with default params) | `200 OK` |
| `02_search_title.png` | GET `/books/?search_q=harry` (Partial title search) | `200 OK` |
| `03_sort_asc.png` | GET `/books/?order_by=price&order=ASC` (Ascending sort) | `200 OK` |
| `04_sort_desc.png` | GET `/books/?order_by=price&order=DESC` (Descending sort) | `200 OK` |
| `05_pagination.png` | GET `/books/?limit=3&offset=3` (Limit & Offset) | `200 OK` |
| `06_price_filter.png` | GET `/books/?min_price=100&max_price=500` (Price range) | `200 OK` |
| `07_combined_query.png` | GET `/books/?search_q=harry&order_by=price&order=DESC&limit=5&offset=0` | `200 OK` |
| `08_get_book_by_id.png` | GET `/books/1/` (Retrieve single book by ID) | `200 OK` |
| `09_post_create_book.png` | POST `/books/` (Create new book with valid payload) | `201 Created` |
| `10_put_update_book.png` | PUT `/books/1/` (Update existing book) | `200 OK` |
| `11_delete_book.png` | DELETE `/books/10/` (Delete book by ID) | `200 OK` |
| `12_post_missing_title.png` | POST `/books/` with missing title | `400 Bad Request` |
| `13_post_missing_price.png` | POST `/books/` with missing price | `400 Bad Request` |
| `14_post_non_numeric_price.png` | POST `/books/` with price = "free" | `400 Bad Request` |
| `15_get_nonexistent_book.png` | GET `/books/99999/` | `404 Not Found` |
| `16_put_nonexistent_book.png` | PUT `/books/99999/` | `404 Not Found` |
| `17_delete_nonexistent_book.png` | DELETE `/books/99999/` | `404 Not Found` |
| `18_invalid_query_params.png` | GET `/books/?order_by=invalid_col` or `/books/?min_price=500&max_price=200` | `400 Bad Request` |

> **Note:** Save the captured screenshots directly in this folder using the filenames listed above. They will automatically render in `README.md`.

