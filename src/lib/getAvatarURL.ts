export default function getAvatarURL(id: string, avatar: string) {
  if (avatar == "1" || avatar == "2" || avatar == "3" || avatar == "4")
    return `https://cdn.discordapp.com/embed/avatars/${avatar}.png`;
  var ani = false;
  if (avatar?.startsWith("a_")) ani = true;
  const aniurl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.gif`;
  const nonurl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
  const url = ani ? aniurl : nonurl;
  return url;
}