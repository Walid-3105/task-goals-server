const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  role: { type: String, default: "user" },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
