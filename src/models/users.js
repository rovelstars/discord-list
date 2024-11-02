import mongoose from "mongoose";
const { Schema } = mongoose;
const Users = new Schema(
  {
    id: { type: String, unique: true, required: true },
    _id: {
      default: () => new Date(),
      type: Date,
    }, //added at
    username: { type: String, required: true },
    avatar: { type: String, required: true },
    discriminator: { type: String, required: true },
    email: { type: String },
    bal: { type: Number, default: 50 },
    bio: { type: String, default: "The user doesn't have bio set!" },
    banner: { type: String },
    badges: [{ type: String }],
    promoted: { type: Boolean, default: false },
    address: { type: String },
    lang: { type: String, default: "en" },
    lastLogin: { type: Date, default: () => new Date() },
    mfa: { type: Boolean },
    nitro: { type: Number },
    old: { type: Boolean, default: true },
    votes: [
      {
        bot: { type: String },
        at: { type: Date , default: () => new Date()},
      }
    ],
    keys: [
      {
        access_token: { type: String },
        expires_in: { type: Number },
        refresh_token: { type: String },
        scope: { type: String },
        expireTimestamp: { type: Number },
      },
    ],
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

Users.virtual("avatarURL").get(function () {
  if (
    this.avatar == "1" ||
    this.avatar == "2" ||
    this.avatar == "3" ||
    this.avatar == "4"
  ) {
    return `https://cdn.discordapp.com/embed/avatars/${this.avatar}.png`;
  } else {
    var ani = false;
    if (this.avatar?.startsWith("a_")) ani = true;
    const aniurl = `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.gif`;
    const nonurl = `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png`;
    const url = ani ? aniurl : nonurl;
    return url;
  }
});
Users.virtual("tag").get(function () {
  return `${this.username}`; //discriminator is DEPRECATED.
});

var users;
try {
  console.log("[DB] Compiling Schema into Model - Users");
  users = mongoose.model("Users", Users);
} catch (e) {
  users = mongoose.model("Users");
}
export default users;
