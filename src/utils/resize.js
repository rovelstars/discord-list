const sharp = require("sharp");

async function resize(base64Image) {
  const destructImage = base64Image.split(";");
  const mimType = destructImage[0].split(":")[1];
  const imageData = destructImage[1].split(",")[1];

  try {
    let resizedImage = Buffer.from(imageData, "base64")
    resizedImage = await sharp(resizedImage).resize(10, 10).toBuffer()
    
    return `data:${mimType};base64,${resizedImage.toString("base64")}`
  } catch (error) {
    console.log({ error })
  }
};
module.exports = resize;