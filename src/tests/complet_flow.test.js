const axios = require("axios");

const URL_BASE = "http://localhost:3000";

let authToken = "";
let memberId = "";

// Dados de teste
const testUser = {
  name: "Teste Usuario",
  email: "teste@example.com",
  password: "senha123",
};

const testMember = {
  name: "Test name",
  email: "test@gmail.com",
  birth_date: "12/12/2012",
  status: true,
};

describe("Fluxo completo de testes da API", () => {
  // Teste de conexão com a API
  test("Deve verificar se a API está online", async () => {
    const response = await axios.get(URL_BASE);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("endpoints");
  });

  // Teste de registro de usuário
  test("Deve registrar um novo usuário", async () => {
    const response = await axios.post(`${URL_BASE}/user`, testUser);
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");
    expect(response.data.data).toHaveProperty("user");
  });

  // Teste de login
  test("Deve fazer login com o usuário criado", async () => {
    const response = await axios.post(`${URL_BASE}/user/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");
    expect(response.data.data).toHaveProperty("token");
    authToken = response.data.data.token;
  });

  // Teste de busca de usuário
  test("Deve buscar o usuário logado", async () => {
    const response = await axios.get(`${URL_BASE}/user`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");
    expect(response.data.data).toHaveProperty("name", testUser.name);
  });

  // Teste de criação de membro
  test("Deve criar um novo membro", async () => {
    const response = await axios.post(`${URL_BASE}/member`, testMember, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");
    expect(response.data.data).toHaveProperty("_id");
    memberId = response.data.data._id;
  });

  // Teste de listagem de membros
  test("Deve listar todos os membros", async () => {
    const response = await axios.get(`${URL_BASE}/member`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  // Teste de busca de membro por ID
  test("Deve buscar o membro criado por ID", async () => {
    const response = await axios.get(`${URL_BASE}/member/${memberId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data[0].name).toBe(testMember.name);
  });

  // Teste de atualização de membro
  test("Deve atualizar o membro", async () => {
    const updatedMember = { ...testMember, name: "Membro Atualizado" };
    const response = await axios.put(`${URL_BASE}/member/${memberId}`, updatedMember, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");
    expect(response.data.data.name).toBe(updatedMember.name);
  });

  // Teste de remoção de membro
  test("Deve remover o membro", async () => {
    const response = await axios.delete(`${URL_BASE}/member/${memberId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
  });

  // Teste de remoção de usuário
  test("Deve remover o usuário", async () => {
    const response = await axios.delete(`${URL_BASE}/user`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
  });
});
