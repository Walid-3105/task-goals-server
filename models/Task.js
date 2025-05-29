const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  email: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  category: String,
  type: { type: String, default: "active" },
  deadline: Date,
  order: Number,
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
