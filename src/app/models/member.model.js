const mongoose = require("mongoose");
const { Schema } = mongoose;

const memberSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    birth_date: {
      type: Date,
      required: true,
    },
    batism_date: {
      type: Date,
      required: false,
    },
    status: {
      type: Boolean,
      required: true,
      default: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
