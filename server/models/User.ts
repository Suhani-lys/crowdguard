import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String },
  points: { type: Number, default: 0 },
  badges: [{ type: String }],
  rank: { type: Number },
});

export default mongoose.model("User", userSchema);
