export default function getAvatarURL(id: string, avatar: string, size?: number) {
  if (avatar == "0" || avatar == "1" || avatar == "2" || avatar == "3" || avatar == "4")
    return `https://cdn.discordapp.com/embed/avatars/${avatar}.png`;
  var ani = false;
  if (avatar?.startsWith("a_")) ani = true;
  const aniurl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.gif${size ? `?size=${size}` : ""}`;
  const nonurl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png${size ? `?size=${size}` : ""}`;
  const url = ani ? aniurl : nonurl;
  return url;
}