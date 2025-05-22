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

| Method | Endpoint         | Description                           |
| ------ | ---------------- | ------------------------------------- |
| POST   | `/user/`         | Registrar novo usuário(igreja)        |
| POST   | `/user/login`    | Fazer login para receber um token     |
| GET    | `/user/`         | Verify email address                  |

---

### Members

| Method | Endpoint        | Description                              |
| ------ | --------------- | ---------------------------------------- |
| GET    | `/member`       | Lista todos os membros de uma igreja     |
| GET    | `/member/:id`   | Busca um membro pelo seu ID              |
| POST   | `/member`       | Cria novo Membro                         |
| PUT    | `/member/:id`   | Atualiza os dados de um membro existente |
| DELETE | `/member/:id`   | Deleta um membro pelo seu ID             |


---

### Ministries

| Method | Endpoint          | Description                              |
| ------ | ----------------- | ---------------------------------------- |
| GET    | `/ministry`       | Lista todos os ministérios de uma igreja |
| GET    | `/ministry/:id`   | Busca um ministério pelo seu ID          |
| POST   | `/ministry`       | Cria novo Ministério                     |
| PUT    | `/ministry/:id`   | Atualiza os dados de um ministério       |
| DELETE | `/ministry/:id`   | Deleta um ministério pelo seu ID         |


---

### Transactions

| Method | Endpoint             | Description                              |
| ------ | -------------------- | ---------------------------------------- |
| GET    | `/transaction`       | Lista todas as transações de uma igreja  |
| GET    | `/transaction/:id`   | Busca uma transação pelo seu ID          |
| POST   | `/transaction`       | Cria nova Transação                      |
| PUT    | `/transaction/:id`   | Atualiza os dados de uma transação       |
| DELETE | `/transaction/:id`   | Deleta uma transação pelo seu ID         |

