# ChurchFlow API Documentation

## Overview

This document outlines all API endpoints for the ChurchFlow system, a CRM solution designed for churches to manage their members, ministries, and finances. The API follows RESTful principles and uses JSON for data exchange.

## Base URL

```
https://api.churchflow.com/v1
```

## Authentication

ChurchFlow uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid access token included in the Authorization header:

```
Authorization: Bearer {access_token}
```

---

## API Endpoints

### Authentication

| Method | Endpoint                    | Description                           |
| ------ | --------------------------- | ------------------------------------- |
| POST   | `/auth/register`            | Register a new church account         |
| POST   | `/auth/login`               | Authenticate and receive access token |
| POST   | `/auth/refresh`             | Refresh access token                  |
| POST   | `/auth/forgot-password`     | Request password reset                |
| POST   | `/auth/reset-password`      | Reset password with token             |
| GET    | `/auth/verify-email/:token` | Verify email address                  |

#### POST `/auth/register`

Creates a new church account in the system.

**Request Body:**

```json
{
  "churchName": "First Baptist Church",
  "email": "admin@firstbaptist.org",
  "password": "securePassword123",
  "phone": "+1234567890",
  "address": "123 Church St, City, State",
  "cnpj": "12.345.678/0001-90",
  "foundationDate": "1980-05-15"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Church account created successfully",
  "data": {
    "id": "6057c4f8b1a7c73a8c123456",
    "churchName": "First Baptist Church",
    "email": "admin@firstbaptist.org"
  }
}
```

#### POST `/auth/login`

Authenticates a church account and returns access and refresh tokens.

**Request Body:**

```json
{
  "email": "admin@firstbaptist.org",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6057c4f8b1a7c73a8c123456",
      "churchName": "First Baptist Church",
      "email": "admin@firstbaptist.org"
    }
  }
}
```

---

### Members

| Method | Endpoint         | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| GET    | `/members`       | List members with pagination and filters |
| GET    | `/members/:id`   | Get a specific member by ID              |
| POST   | `/members`       | Create a new member                      |
| PUT    | `/members/:id`   | Update a member                          |
| DELETE | `/members/:id`   | Delete a member                          |
| GET    | `/members/stats` | Get member statistics                    |

#### GET `/members`

Lists members with optional filtering, sorting, and pagination.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for name or email
- `status`: Filter by status (active, inactive)
- `sort`: Sort field (name, createdAt, etc.)
- `order`: Sort order (asc, desc)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "members": [
      {
        "id": "6057c4f8b1a7c73a8c123456",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "status": true,
        "birthDate": "1985-05-15",
        "baptismDate": "2010-06-20",
        "maritalStatus": "married",
        "createdAt": "2023-01-15T14:30:45.123Z"
      }
      // More members...
    ]
  }
}
```

#### POST `/members`

Creates a new member.

**Request Body:**

```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "+1987654321",
  "birthDate": "1990-08-23",
  "baptismDate": "2015-10-15",
  "address": "456 Main St, City, State",
  "document": "123.456.789-00",
  "maritalStatus": "single"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Member created successfully",
  "data": {
    "id": "6057c4f8b1a7c73a8c789012",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "createdAt": "2023-05-20T10:15:30.123Z"
  }
}
```

---

### Ministries

| Method | Endpoint                            | Description                                 |
| ------ | ----------------------------------- | ------------------------------------------- |
| GET    | `/ministries`                       | List ministries with pagination and filters |
| GET    | `/ministries/:id`                   | Get a specific ministry by ID               |
| POST   | `/ministries`                       | Create a new ministry                       |
| PUT    | `/ministries/:id`                   | Update a ministry                           |
| DELETE | `/ministries/:id`                   | Delete a ministry                           |
| GET    | `/ministries/:id/members`           | Get members of a specific ministry          |
| POST   | `/ministries/:id/members`           | Add members to a ministry                   |
| DELETE | `/ministries/:id/members/:memberId` | Remove a member from a ministry             |

#### GET `/ministries`

Lists ministries with optional filtering, sorting, and pagination.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for name or description
- `status`: Filter by status (active, inactive)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "ministries": [
      {
        "id": "6057c4f8b1a7c73a8c123456",
        "name": "Youth Ministry",
        "description": "Ministry for teenagers and young adults",
        "status": true,
        "creationDate": "2022-03-15T14:30:45.123Z",
        "responsible": {
          "id": "6057c4f8b1a7c73a8c789012",
          "name": "Jane Smith"
        }
      }
      // More ministries...
    ]
  }
}
```

#### POST `/ministries`

Creates a new ministry.

**Request Body:**

```json
{
  "name": "Children's Ministry",
  "description": "Ministry for children ages 4-12",
  "memberId": "6057c4f8b1a7c73a8c789012"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Ministry created successfully",
  "data": {
    "id": "6057c4f8b1a7c73a8c345678",
    "name": "Children's Ministry",
    "description": "Ministry for children ages 4-12",
    "creationDate": "2023-05-20T10:15:30.123Z"
  }
}
```

---

### Financial Management - Income

| Method | Endpoint                           | Description                                     |
| ------ | ---------------------------------- | ----------------------------------------------- |
| GET    | `/financial/incomes`               | List income entries with pagination and filters |
| GET    | `/financial/incomes/:id`           | Get a specific income entry by ID               |
| POST   | `/financial/incomes`               | Create a new income entry                       |
| PUT    | `/financial/incomes/:id`           | Update an income entry                          |
| DELETE | `/financial/incomes/:id`           | Delete an income entry                          |
| GET    | `/financial/income-categories`     | List income categories                          |
| POST   | `/financial/income-categories`     | Create a new income category                    |
| PUT    | `/financial/income-categories/:id` | Update an income category                       |
| DELETE | `/financial/income-categories/:id` | Delete an income category                       |

#### GET `/financial/incomes`

Lists income entries with optional filtering, sorting, and pagination.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `startDate`: Filter by start date (YYYY-MM-DD)
- `endDate`: Filter by end date (YYYY-MM-DD)
- `categoryId`: Filter by category ID
- `memberId`: Filter by member ID

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 250,
    "page": 1,
    "limit": 20,
    "totalAmount": 15750.5,
    "incomes": [
      {
        "id": "6057c4f8b1a7c73a8c123456",
        "amount": 500.0,
        "incomeDate": "2023-05-15T10:00:00.000Z",
        "observation": "Sunday tithe",
        "category": {
          "id": "6057c4f8b1a7c73a8c987654",
          "name": "Tithe"
        },
        "member": {
          "id": "6057c4f8b1a7c73a8c789012",
          "name": "Jane Smith"
        }
      }
      // More incomes...
    ]
  }
}
```

#### POST `/financial/incomes`

Creates a new income entry.

**Request Body:**

```json
{
  "amount": 250.0,
  "incomeDate": "2023-05-20T10:00:00.000Z",
  "observation": "Weekly offering",
  "incomeCategoryId": "6057c4f8b1a7c73a8c987654",
  "memberId": "6057c4f8b1a7c73a8c789012"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Income entry created successfully",
  "data": {
    "id": "6057c4f8b1a7c73a8c345678",
    "amount": 250.0,
    "incomeDate": "2023-05-20T10:00:00.000Z"
  }
}
```

---

### Financial Management - Expenses

| Method | Endpoint                            | Description                                      |
| ------ | ----------------------------------- | ------------------------------------------------ |
| GET    | `/financial/expenses`               | List expense entries with pagination and filters |
| GET    | `/financial/expenses/:id`           | Get a specific expense entry by ID               |
| POST   | `/financial/expenses`               | Create a new expense entry                       |
| PUT    | `/financial/expenses/:id`           | Update an expense entry                          |
| DELETE | `/financial/expenses/:id`           | Delete an expense entry                          |
| GET    | `/financial/expense-categories`     | List expense categories                          |
| POST   | `/financial/expense-categories`     | Create a new expense category                    |
| PUT    | `/financial/expense-categories/:id` | Update an expense category                       |
| DELETE | `/financial/expense-categories/:id` | Delete an expense category                       |

#### GET `/financial/expenses`

Lists expense entries with optional filtering, sorting, and pagination.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `startDate`: Filter by start date (YYYY-MM-DD)
- `endDate`: Filter by end date (YYYY-MM-DD)
- `categoryId`: Filter by category ID
- `ministryId`: Filter by ministry ID
- `paid`: Filter by payment status (true, false)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 180,
    "page": 1,
    "limit": 20,
    "totalAmount": 12450.75,
    "expenses": [
      {
        "id": "6057c4f8b1a7c73a8c123456",
        "amount": 350.0,
        "paymentDate": "2023-05-15T10:00:00.000Z",
        "observation": "Utility bill",
        "paid": true,
        "category": {
          "id": "6057c4f8b1a7c73a8c987654",
          "name": "Utilities"
        },
        "ministry": {
          "id": "6057c4f8b1a7c73a8c789012",
          "name": "Administration"
        }
      }
      // More expenses...
    ]
  }
}
```

#### POST `/financial/expenses`

Creates a new expense entry.

**Request Body:**

```json
{
  "amount": 150.0,
  "paymentDate": "2023-05-20T10:00:00.000Z",
  "observation": "Supplies for youth event",
  "paid": true,
  "expenseCategoryId": "6057c4f8b1a7c73a8c987654",
  "ministryId": "6057c4f8b1a7c73a8c789012"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Expense entry created successfully",
  "data": {
    "id": "6057c4f8b1a7c73a8c345678",
    "amount": 150.0,
    "paymentDate": "2023-05-20T10:00:00.000Z",
    "paid": true
  }
}
```

---

### Reports and Dashboard

| Method | Endpoint                        | Description                           |
| ------ | ------------------------------- | ------------------------------------- |
| GET    | `/reports/financial/summary`    | Get financial summary by period       |
| GET    | `/reports/financial/monthly`    | Get monthly financial report          |
| GET    | `/reports/financial/categories` | Get financial breakdown by categories |
| GET    | `/reports/members/growth`       | Get member growth statistics          |
| GET    | `/reports/members/demographics` | Get member demographics               |
| GET    | `/dashboard`                    | Get dashboard overview data           |

#### GET `/reports/financial/summary`

Gets a summary of financial data for a specified period.

**Query Parameters:**

- `startDate`: Start date for the report (YYYY-MM-DD)
- `endDate`: End date for the report (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-01-01",
      "end": "2023-05-31"
    },
    "totalIncome": 45750.25,
    "totalExpenses": 32480.5,
    "balance": 13269.75,
    "incomeByCategory": [
      {
        "category": "Tithe",
        "amount": 28500.0,
        "percentage": 62.3
      },
      {
        "category": "Offerings",
        "amount": 15250.25,
        "percentage": 33.3
      },
      {
        "category": "Other",
        "amount": 2000.0,
        "percentage": 4.4
      }
    ],
    "expensesByCategory": [
      {
        "category": "Utilities",
        "amount": 8500.5,
        "percentage": 26.2
      },
      {
        "category": "Salaries",
        "amount": 15000.0,
        "percentage": 46.2
      },
      {
        "category": "Events",
        "amount": 5980.0,
        "percentage": 18.4
      },
      {
        "category": "Other",
        "amount": 3000.0,
        "percentage": 9.2
      }
    ]
  }
}
```

#### GET `/dashboard`

Gets overview data for the dashboard.

**Response:**

```json
{
  "success": true,
  "data": {
    "members": {
      "total": 150,
      "active": 132,
      "newThisMonth": 5
    },
    "ministries": {
      "total": 12,
      "active": 10
    },
    "finances": {
      "currentMonthIncome": 5750.25,
      "currentMonthExpenses": 4320.5,
      "balance": 1429.75,
      "previousMonthComparison": {
        "income": "+5.2%",
        "expenses": "-2.1%"
      }
    },
    "recentTransactions": [
      {
        "id": "6057c4f8b1a7c73a8c123456",
        "type": "income",
        "amount": 500.0,
        "date": "2023-05-15T10:00:00.000Z",
        "category": "Tithe"
      },
      {
        "id": "6057c4f8b1a7c73a8c123457",
        "type": "expense",
        "amount": 350.0,
        "date": "2023-05-15T10:00:00.000Z",
        "category": "Utilities"
      }
      // More transactions...
    ]
  }
}
```

---

### System Management

| Method | Endpoint                      | Description                              |
| ------ | ----------------------------- | ---------------------------------------- |
| GET    | `/system/logs`                | Get system logs (admin only)             |
| GET    | `/system/user-sessions`       | Get active user sessions (admin only)    |
| POST   | `/system/logout-all-sessions` | Log out all active sessions (admin only) |
| GET    | `/system/church-profile`      | Get church profile information           |
| PUT    | `/system/church-profile`      | Update church profile information        |

#### GET `/system/church-profile`

Gets the profile information for the authenticated church.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "6057c4f8b1a7c73a8c123456",
    "churchName": "First Baptist Church",
    "email": "admin@firstbaptist.org",
    "phone": "+1234567890",
    "address": "123 Church St, City, State",
    "cnpj": "12.345.678/0001-90",
    "logoUrl": "https://storage.churchflow.com/logos/first-baptist.png",
    "foundationDate": "1980-05-15",
    "createdAt": "2023-01-15T14:30:45.123Z"
  }
}
```

---

## Status Codes

| Status Code | Description                                                |
| ----------- | ---------------------------------------------------------- |
| 200         | OK - Request succeeded                                     |
| 201         | Created - Resource created successfully                    |
| 400         | Bad Request - Invalid data or parameters                   |
| 401         | Unauthorized - Authentication required                     |
| 403         | Forbidden - Insufficient permissions                       |
| 404         | Not Found - Resource not found                             |
| 500         | Internal Server Error - Something went wrong on the server |

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found",
    "details": "Member with ID 6057c4f8b1a7c73a8c123456 does not exist"
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Current limits:

- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

When the limit is exceeded, the API will respond with a 429 Too Many Requests status code.
