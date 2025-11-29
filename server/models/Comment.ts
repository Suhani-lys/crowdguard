import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  id: string;
  incidentId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
}

const CommentSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  incidentId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IComment>("Comment", CommentSchema);
