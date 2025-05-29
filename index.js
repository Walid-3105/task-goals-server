require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",

    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// secret token
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// Mongoose connection
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ad8zj.mongodb.net/taskDB?retryWrites=true&w=majority&appName=Cluster0`
  )

  .then(() => console.log("Connected to MongoDB via Mongoose"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Mongoose models
const User = require("./models/User");
const Task = require("./models/Task");
const Goal = require("./models/Goal");

// jwt token
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "5h" });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: false,
    })
    .send({ success: true });
});

app.post("/logout", (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
});

// Create goal
app.post("/goals", async (req, res) => {
  try {
    const goal = new Goal(req.body);
    const saved = await goal.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all goals
app.get("/goals", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).send({ message: "Email is Needed" });
  }
  const goals = await Goal.find({ email });
  res.json(goals);
});

// Update goal
app.patch("/goals/:id", async (req, res) => {
  try {
    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(goal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete goal
app.delete("/goals/:id", async (req, res) => {
  await Goal.findByIdAndDelete(req.params.id);
  res.json({ message: "Goal deleted" });
});

// Routes
app.post("/users", async (req, res) => {
  const user = req.body;
  const existingUser = await User.findOne({ email: user.email });
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }
  const result = await User.create(user);
  res.send(result);
});

app.get("/users", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).send({ message: "Email is Needed" });
  }
  const result = await User.find({ email });
  res.send(result);
});

app.get("/tasks", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const tasks = await Task.find({ email });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const data = req.body;
    if (!data.email || !data.title) {
      return res.status(400).json({ error: "Email and title are required" });
    }
    data.order = Date.now();
    const result = await Task.create(data);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/tasks/:id", async (req, res) => {
  try {
    const { title, description, category, type } = req.body;
    const id = req.params.id;

    const result = await Task.findByIdAndUpdate(
      id,
      { title, description, category, type },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: "Task not found or update failed" });
    }

    res.json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Task.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/tasks/update-status", async (req, res) => {
  try {
    const currentDate = new Date();
    const result = await Task.updateMany(
      { deadline: { $lt: currentDate }, type: "active" },
      { $set: { type: "timeout" } }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update tasks" });
  }
});

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    const expiredTasks = await Task.find({
      deadline: { $lt: now },
      type: "active",
    });

    if (expiredTasks.length > 0) {
      await Task.updateMany(
        { _id: { $in: expiredTasks.map((task) => task._id) } },
        { $set: { type: "timeout" } }
      );
      console.log(`${expiredTasks.length} tasks moved to timeout.`);
    }
  } catch (error) {
    console.error("Error updating expired tasks:", error);
  }
});

app.get("/", (req, res) => {
  res.send("Task Manager API is running!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
