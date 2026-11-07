# Postman Test Screenshots Directory

This directory stores the visual verification screenshots for BDF Lab 3 submission.

## Captured Screenshots (15/15)

| File Name | Test Description | Status Code |
| :--- | :--- | :--- |
| `01_get_all_books.png.png` | GET `/books/` (Retrieve all books with default parameters) | `200 OK` |
| `02_search_books.png.png` | GET `/books/?search_q=harry` (Partial title search via SQL LIKE) | `200 OK` |
| `03_sort_ascending.png.png` | GET `/books/?order_by=price&order=ASC` (Ascending price sort) | `200 OK` |
| `04_sort_descending.png.png` | GET `/books/?order_by=price&order=DESC` (Descending price sort) | `200 OK` |
| `05_pagination.png.png` | GET `/books/?limit=3&offset=3` (Pagination with limit & offset) | `200 OK` |
| `06_price_filter.png.png` | GET `/books/?min_price=100&max_price=500` (Price range filter) | `200 OK` |
| `07_get_single_book.png.png` | GET `/books/1/` (Retrieve single book by ID) | `200 OK` |
| `08_add_book.png.png` | POST `/books/` (Create new book with validated payload) | `201 Created` |
| `09_update_book.png.png` | PUT `/books/1/` (Update existing book by ID) | `200 OK` |
| `10_delete_book.png.png` | DELETE `/books/10/` (Delete book by ID) | `200 OK` |
| `11_validation_missing_title.png.png` | POST `/books/` (Missing title validation failure) | `400 Bad Request` |
| `12_validation_missing_author.png.png` | POST `/books/` (Missing author validation failure) | `400 Bad Request` |
| `13_validation_missing_price.png.png` | POST `/books/` (Missing price validation failure) | `400 Bad Request` |
| `14_validation_invalid_price.png.png` | POST `/books/` (Non-numeric / invalid price validation failure) | `400 Bad Request` |
| `15_book_not_found.png.png` | GET `/books/99999/` (Nonexistent book ID) | `404 Not Found` |
