function passGen() {
  let time = new Date().getTime();

  let password = "RDL-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c) => {
      let random = (time + Math.random() * 16) % 16 | 0;
      time = Math.floor(time / 16);
      return (c == "x" ? random : (random & 0x3) | 0x8).toString(16);
    }
  );
  return password;
}
export default passGen;
