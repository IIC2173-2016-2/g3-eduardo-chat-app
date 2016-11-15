const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema({
  id: { type: String, index: { unique: true } },
  name: String,
  users: [{ user_id: String, username: String }]
});
mongoose.model("Chat", chatSchema);
mongoose.model("Backup", chatSchema);
