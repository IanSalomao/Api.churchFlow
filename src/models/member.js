const mongoose = require("mongoose");

// Schema para ministérios do membro
const memberMinistrySchema = new mongoose.Schema(
  {
    ministry_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: String,
    joined_date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Schema para membro
const memberSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    birth_date: Date,
    baptism_date: Date,
    address: {
      street: String,
      city: String,
      state: String,
      zipcode: String,
    },
    document: {
      type: String,
      trim: true,
    },
    marital_status: {
      type: String,
      enum: ["solteiro", "casado", "divorciado", "viúvo", "outro"],
      default: "solteiro",
    },
    status: {
      type: Boolean,
      default: true,
    },
    ministries: [memberMinistrySchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Índices para melhorar performance
memberSchema.index({ user_id: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ name: "text" }); // Índice de texto para busca por nome

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
