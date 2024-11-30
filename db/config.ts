import { defineDb, defineTable, column } from 'astro:db';

const Bots = defineTable({
  columns: {
    card: column.json({ optional: true }),
    approved: column.boolean(),
    servers: column.number(),
    promoted: column.boolean(),
    votes: column.number(),
    badges: column.json(),
    opted_coins: column.boolean(), //if the bot has opted for coins, default is false
    id: column.text(),
    username: column.text(),
    discriminator: column.text(),
    avatar: column.text(),
    short: column.text(), //short description
    desc: column.text(), //full page description
    prefix: column.text(), //bot prefix
    lib: column.text(),
    code: column.text({ optional: true, unique: true }),
    webhook: column.text({ optional: true }),
    support: column.text({ optional: true }), //support server id
    bg: column.text({ optional: true }), //background image url
    source_repo: column.text({ optional: true }), //github or gitlab repo url
    website: column.text({ optional: true }), //bot website url
    donate: column.text({ optional: true }), //donate link
    invite: column.text(), //invite link
    slug: column.text(), // bot vanity url, e.g. /bots/:slug. if not set, it will be bot id
    added_at: column.date({ default: new Date(), primaryKey: true }), //added at
    owners: column.json(), //owners is an array of user ids referencing the Users table
  },
  indexes: [
    { on: ['id', 'username'], unique: true },
    { on: ['slug'], unique: true },
    { on: ['approved'] },
    { on: ['promoted'] },
    { on: ['short'] },
    { on: ['votes'] }
  ],
});

const Users = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    username: column.text(),
    discriminator: column.text(),
    avatar: column.text(),
    email: column.text({ unique: true, optional: true }),
    bal: column.number({ default: 50 }),
    bio: column.text({ default: "The user doesn't have bio set!" }),
    banner: column.text({ optional: true }),
    badges: column.json(),
    lang: column.text({ default: "en" }),
    lastLogin: column.date({ default: new Date() }),
    nitro: column.number({ default: 0 }),
    old: column.boolean({ default: true }),
    votes: column.json(),
    added_at: column.date({ default: new Date(), primaryKey: true }),
    keys: column.json()
  },
  indexes: [
    { on: ['id', 'username'], unique: true },
    { on: ['email'], unique: true },
    { on: ['bal'] }
  ]
});

/*
const Servers = new Schema(
  {
    id: { type: String, required: true },
    _id: {
      default: () => new Date(),
      type: Date,
    }, //added at
    short: { type: String, default: "Short description is not Updated." },
    name: { type: String, required: true },
    desc: { type: String, default: "Description is not updated." },
    owner: { type: String, required: true },
    icon: { type: String },
    promoted: { type: Boolean, default: false },
    badges: [{ type: String }],
    slug: {
      type: String,
      default: function () {
        return this.id;
      },
      unique: true,
    },
    votes: { type: Number, default: 0 },
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
*/

const Servers = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    short: column.text({ default: "Short description is not Updated." }),
    name: column.text(),
    desc: column.text({ default: "Description is not updated." }),
    owner: column.text(),
    icon: column.text(),
    promoted: column.boolean({ default: false }),
    badges: column.json(),
    slug: column.text({ unique: true }),
    added_at: column.date({ default: new Date(), primaryKey: true }),
    votes: column.number({ default: 0 })
  },
  indexes: [
    { on: ['id', 'name'], unique: true },
    { on: ['promoted'] },
    { on: ['votes'] }
  ]
});




// https://astro.build/db/config
export default defineDb({
  tables: {
    Bots,
    Users,
    Servers
  }
});
