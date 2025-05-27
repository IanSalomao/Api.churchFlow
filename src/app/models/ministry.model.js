const mongoose = require("mongoose");
const { Schema } = mongoose;

const ministrySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    status: {
      type: Boolean,
      required: true,
      default: true,
    },
    member_id: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
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

const Ministry = mongoose.model("Ministry", ministrySchema);

module.exports = Ministry;
