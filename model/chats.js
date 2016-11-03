const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema({
  id: { type: String, index: { unique: true } },
  name: String,
  users: [{ id: { type: String, unique: true }, username: String }],
  time: { type: Date, default: Date.now }
});
mongoose.model("Chat", chatSchema);
