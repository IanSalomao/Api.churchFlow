const express = require("express");
const App = express();
const userRoutes = require("./src/routes/user.route");
const memberRoutes = require("./src/routes/member.route");
const ministryRoutes = require("./src/routes/ministry.route");
const transactionRoutes = require("./src/routes/transaction.route");

const connectDB = require("./src/core/db_connect");

require("dotenv").config();

App.use(express.json());
App.use("/user", userRoutes);
App.use("/member", memberRoutes);
App.use("/ministry", ministryRoutes);
App.use("/transaction", transactionRoutes);

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    App.listen(PORT, () => {
      console.log("Servidor rodando em:");
      console.log(`http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao iniciar a aplicação:", error);
  });
