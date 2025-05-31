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

**MongoDB Queries:**

```javascript
// Agregação principal para total de receita por categoria
db.transactions.aggregate([
  {
    $match: {
      user_id: ObjectId("user_id"),
      date: {
        $gte: ISODate("2024-01-01"),
        $lte: ISODate("2024-12-31"),
      },
    },
  },
  { $unwind: "$categories" },
  {
    $group: {
      _id: "$categories",
      total: { $sum: "$value" },
    },
  },
]);

// Explicação: Usamos $match para filtrar por usuário e período,
// $unwind para "explodir" o array de categorias e poder agrupar por cada categoria individual,
// e $group para somar os valores por categoria
```

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

**MongoDB Queries:**

```javascript
// Query principal para distribuição de idade e status
db.members.aggregate([
  {
    $match: {
      user_id: ObjectId("user_id"),
    },
  },
  {
    $facet: {
      status: [
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ],
      baptism: [
        {
          $match: {
            batism_date: {
              $exists: true,
              $ne: null,
            },
          },
        },
        { $count: "total" },
      ],
    },
  },
]);

// Explicação: Utilizamos $facet para executar múltiplas agregações em uma única query,
// otimizando a performance. Isso nos permite obter diferentes métricas em uma única chamada ao banco
```

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

**MongoDB Queries:**

```javascript
// Query principal para dados dos ministérios e suas transações
db.ministries.aggregate([
  {
    $match: {
      user_id: ObjectId("user_id"),
    },
  },
  {
    $lookup: {
      from: "members",
      localField: "member_id",
      foreignField: "_id",
      as: "leader",
    },
  },
  {
    $lookup: {
      from: "transactions",
      localField: "_id",
      foreignField: "ministry_id",
      as: "transactions",
    },
  },
  {
    $project: {
      ministry_name: "$name",
      leader: { $arrayElemAt: ["$leader.name", 0] },
      total_transactions: { $sum: "$transactions.value" },
      transaction_count: { $size: "$transactions" },
    },
  },
]);

// Explicação: Utilizamos $lookup para fazer joins com as coleções de members e transactions,
// permitindo buscar informações do líder e das transações em uma única query.
// O $project formata os dados no formato desejado para a resposta
```

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

**MongoDB Queries:**

```javascript
// Query para estatísticas recentes
const weekAgo = new Date(new Date().setDate(new Date().getDate() - 7));

db.transactions.aggregate([
  {
    $match: {
      user_id: ObjectId("user_id"),
      date: { $gte: weekAgo },
    },
  },
  {
    $facet: {
      categories: [
        { $unwind: "$categories" },
        {
          $group: {
            _id: "$categories",
            total: { $sum: "$value" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ],
      recent_transactions: [{ $count: "total" }],
    },
  },
]);

// Explicação: Usamos $facet para combinar múltiplas agregações,
// incluindo top categorias e contagens recentes.
// O $sort e $limit garantem que pegamos apenas as 5 principais categorias.
// Esta estrutura minimiza o número de queries ao banco
```

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
