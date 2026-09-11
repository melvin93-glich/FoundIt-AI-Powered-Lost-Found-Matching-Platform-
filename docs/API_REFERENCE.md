# 📚 FoundIt Full REST API Reference

> Auto-generated OpenAPI reference documentation for the FoundIt FastAPI backend.

## Auth

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | NO | Register |
| `POST` | `/auth/login` | NO | Login |
| `GET` | `/auth/me` | YES | Get Me |

## Lost Items

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/lost` | NO | List Lost Items |
| `POST` | `/lost` | YES | Create Lost Item |
| `GET` | `/lost/{item_id}` | NO | Get Lost Item |
| `DELETE` | `/lost/{item_id}` | YES | Delete Lost Item |

## Found Items

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/found` | NO | List Found Items |
| `POST` | `/found` | YES | Create Found Item |
| `GET` | `/found/{item_id}` | NO | Get Found Item |
| `DELETE` | `/found/{item_id}` | YES | Delete Found Item |

## Match

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/matches/{item_id}` | NO | Get Item Matches |
| `POST` | `/match/{item_id}` | NO | Confirm Match |

## Admin Panel

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/admin/users` | YES (Admin) | List All Users |
| `PATCH` | `/admin/users/{user_id}/role` | YES (Admin) | Update User Role |
| `DELETE` | `/admin/users/{user_id}` | YES (Admin) | Delete User |
| `GET` | `/admin/lost` | YES (Admin) | Admin List Lost Items |
| `POST` | `/admin/lost` | YES (Admin) | Admin Create Lost On Behalf |
| `PATCH` | `/admin/lost/{item_id}` | YES (Admin) | Admin Edit Lost Item |
| `DELETE` | `/admin/lost/{item_id}` | YES (Admin) | Admin Delete Lost Item |
| `GET` | `/admin/found` | YES (Admin) | Admin List Found Items |
| `POST` | `/admin/found` | YES (Admin) | Admin Create Found On Behalf |
| `PATCH` | `/admin/found/{item_id}` | YES (Admin) | Admin Edit Found Item |
| `DELETE` | `/admin/found/{item_id}` | YES (Admin) | Admin Delete Found Item |
| `GET` | `/admin/matches` | YES (Admin) | Admin List Matches |
| `PATCH` | `/admin/matches/{source_id}/override` | YES (Admin) | Override Match Status |
| `GET` | `/admin/audit-logs` | YES (Admin) | Get Recent Admin Actions |

## General

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/` | NO | Root |

