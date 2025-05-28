# ChurchFlow API Documentation

## Overview

Este documento descreve todos os endpoints da API para o sistema ChurchFlow, uma solução desenvolvida para igrejas gerenciarem seus membros, ministérios e transações financeiras. A API segue os princípios RESTful e utiliza JSON para troca de dados.

## Authentication

ChurchFlow uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid access token included in the Authorization header:

```
Authorization: Bearer {access_token}
```

---

## API Endpoints

### Authentication

| Method | Endpoint      | Description                       |
| ------ | ------------- | --------------------------------- |
| POST   | `/user/`      | Registrar novo usuário(igreja)    |
| POST   | `/user/login` | Fazer login para receber um token |
| GET    | `/user/`      | Verify email address              |

---

### Members

| Method | Endpoint      | Description                              |
| ------ | ------------- | ---------------------------------------- |
| GET    | `/member`     | Lista todos os membros de uma igreja     |
| GET    | `/member/:id` | Busca um membro pelo seu ID              |
| POST   | `/member`     | Cria novo Membro                         |
| PUT    | `/member/:id` | Atualiza os dados de um membro existente |
| DELETE | `/member/:id` | Deleta um membro pelo seu ID             |

---

### Ministries

| Method | Endpoint        | Description                              |
| ------ | --------------- | ---------------------------------------- |
| GET    | `/ministry`     | Lista todos os ministérios de uma igreja |
| GET    | `/ministry/:id` | Busca um ministério pelo seu ID          |
| POST   | `/ministry`     | Cria novo Ministério                     |
| PUT    | `/ministry/:id` | Atualiza os dados de um ministério       |
| DELETE | `/ministry/:id` | Deleta um ministério pelo seu ID         |

---

### Transactions

| Method | Endpoint           | Description                             |
| ------ | ------------------ | --------------------------------------- |
| GET    | `/transaction`     | Lista todas as transações de uma igreja |
| GET    | `/transaction/:id` | Busca uma transação pelo seu ID         |
| POST   | `/transaction`     | Cria nova Transação                     |
| PUT    | `/transaction/:id` | Atualiza os dados de uma transação      |
| DELETE | `/transaction/:id` | Deleta uma transação pelo seu ID        |

---

### Metrics

| Method | Endpoint              | Description                                   |
| ------ | --------------------- | --------------------------------------------- |
| GET    | `/metrics/financial`  | Retorna métricas financeiras                  |
| GET    | `/metrics/members`    | Retorna métricas relacionadas aos membros     |
| GET    | `/metrics/ministries` | Retorna métricas relacionadas aos ministérios |
| GET    | `/metrics/dashboard`  | Retorna métricas gerais para o dashboard      |

#### GET /metrics/financial

Retorna métricas financeiras detalhadas da igreja.

**Query Parameters:**

- `start_date` (opcional): Data inicial para filtrar (formato: YYYY-MM-DD)
- `end_date` (opcional): Data final para filtrar (formato: YYYY-MM-DD)

**Response:**

```javascript
{
  "data": {
    "total_income": 50000,
    "by_category": {
      "dizimos": 30000,
      "ofertas": 15000,
      "eventos": 5000
    },
    "monthly_summary": [
      {
        "month": "2024-01",
        "total": 15000
      }
    ],
    "comparison": {
      "current_month": 15000,
      "previous_month": 14000,
      "percentage_change": 7.14
    }
  }
}
```

#### GET /metrics/members

Retorna métricas relacionadas aos membros da igreja.

**Response:**

```javascript
{
  "data": {
    "total_members": 150,
    "active_members": 145,
    "inactive_members": 5,
    "growth": {
      "new_members_month": 3,
      "percentage_growth": 2.0
    },
    "age_distribution": {
      "under_18": 20,
      "18_30": 45,
      "31_50": 60,
      "above_50": 25
    },
    "baptism_stats": {
      "total_baptized": 130,
      "pending_baptism": 20,
      "baptisms_this_year": 15
    },
    "monthly_growth": [
      {
        "month": "2024-01",
        "new_members": 3
      }
    ]
  }
}
```

#### GET /metrics/ministries

Retorna métricas relacionadas aos ministérios da igreja.

**Response:**

```javascript
{
  "data": {
    "total_ministries": 8,
    "active_ministries": 7,
    "inactive_ministries": 1,
    "members_distribution": [
      {
        "ministry_name": "Louvor",
        "leader": "João Silva",
        "total_transactions": 12000,
        "transaction_count": 24
      }
    ],
    "financial_summary": {
      "total_spent": 10000,
      "by_ministry": {
        "ministry_id_1": 3000,
        "ministry_id_2": 2500
      }
    }
  }
}
```

#### GET /metrics/dashboard

Retorna métricas gerais para o dashboard.

**Response:**

```javascript
{
  "data": {
    "quick_stats": {
      "total_members": 150,
      "total_ministries": 8,
      "monthly_income": 15000,
      "active_ministries": 7
    },
    "recent_activity": {
      "new_members_week": 2,
      "new_transactions_week": 25,
      "ministry_changes": 1
    },
    "financial_health": {
      "current_month_achieved": 15000
    },
    "top_categories": [
      {
        "name": "dizimos",
        "total": 30000,
        "percentage": 60
      }
    ],
    "top_ministries": [
      {
        "name": "Louvor",
        "total_transactions": 12000
      }
    ]
  }
}
```

## Modelagem de Dados

O ChurchFlow utiliza MongoDB como banco de dados, com os seguintes schemas:

### User (Igreja)

```javascript
{
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  timestamps: true
}
```

### Member (Membro)

```javascript
{
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  birth_date: {
    type: Date,
    required: true
  },
  batism_date: {
    type: Date,
    required: false
  },
  status: {
    type: Boolean,
    required: true,
    default: true
  },
  user_id: {
    type: ObjectId,
    ref: "User",
    required: true
  },
  timestamps: true
}
```

### Ministry (Ministério)

```javascript
{
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  status: {
    type: Boolean,
    required: true,
    default: true
  },
  member_id: {
    type: ObjectId,
    ref: "Member",
    required: true
  },
  user_id: {
    type: ObjectId,
    ref: "User",
    required: true
  },
  timestamps: true
}
```

### Transaction (Transação)

```javascript
{
  value: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: false
  },
  categories: {
    type: [String],
    required: false,
    default: []
  },
  member_id: {
    type: ObjectId,
    ref: "Member",
    required: false
  },
  ministry_id: {
    type: ObjectId,
    ref: "Ministry",
    required: false
  },
  user_id: {
    type: ObjectId,
    ref: "User",
    required: true
  },
  timestamps: true
}
```

### Relacionamentos

1. **User (Igreja)**

   - Uma igreja pode ter vários membros (1:N com Member)
   - Uma igreja pode ter vários ministérios (1:N com Ministry)
   - Uma igreja pode ter várias transações (1:N com Transaction)

2. **Member (Membro)**

   - Um membro pertence a uma igreja (N:1 com User)
   - Um membro pode liderar um ministério (1:N com Ministry)
   - Um membro pode estar associado a várias transações (1:N com Transaction)

3. **Ministry (Ministério)**

   - Um ministério pertence a uma igreja (N:1 com User)
   - Um ministério é liderado por um membro (N:1 com Member)
   - Um ministério pode estar associado a várias transações (1:N com Transaction)

4. **Transaction (Transação)**
   - Uma transação pertence a uma igreja (N:1 com User)
   - Uma transação pode estar associada a um membro OU a um ministério (N:1 com Member OU Ministry)
   - Uma transação pode ter múltiplas categorias (Array de Strings)
