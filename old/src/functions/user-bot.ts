export default async function UserAccountFetch(path, env: { SELFBOT_TOKEN: string }) {
  return await fetch(`https://discord.com/api/v10${path}`, {
    headers: {
      Authorization: env.SELFBOT_TOKEN || "failure management",
    },
  }).then((r) => r.json());
};