const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  email: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ["weekly", "monthly"], required: true },
  createdAt: { type: Date, default: Date.now },
  deadline: { type: Date },
  completed: { type: Boolean, default: false },
});

const Goal = mongoose.model("Goal", goalSchema);
module.exports = Goal;
