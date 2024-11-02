import mongoose from "mongoose";
const { Schema } = mongoose;
const Emojis = new Schema(
  {
    id: { type: Number, required: true },
    _id: {
      default: () => new Date(),
      type: Date,
    }, //added at
    desc: String,
    owner: String,
    gif: { type: Boolean, default: false },
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
var emojis;
try {
  console.log("[DB] Compiling Schema into Model - Emojis");
  emojis = mongoose.model("Emojis", Emojis);
} catch (e) {
  emojis = mongoose.model("Emojis");
}
export default emojis;
