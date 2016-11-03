const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema({
  id: { type: String, index: { unique: true } },
  name: String,
  users: [{ id: String, username: String }]
});
mongoose.model("Chat", chatSchema);
