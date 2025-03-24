const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Schema para categorias de receita
const incomeCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

// Schema para categorias de despesa
const expenseCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

// Schema para usuário (igreja)
const userSchema = new mongoose.Schema(
  {
    church_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipcode: String,
    },
    cnpj: {
      type: String,
      trim: true,
    },
    logo_url: String,
    foundation_date: Date,
    email_verified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Boolean,
      default: true,
    },
    login_attempts: {
      type: Number,
      default: 0,
    },
    income_categories: [incomeCategorySchema],
    expense_categories: [expenseCategorySchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Método para verificar senha
userSchema.methods.verifyPassword = async function (password) {
  return await bcrypt.compare(password, this.password_hash);
};

// Método para gerar hash de senha
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
};

const User = mongoose.model("User", userSchema);

module.exports = User;
