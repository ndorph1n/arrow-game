import { Texture, Spritesheet } from "pixi.js";

export async function loadSpriteSheet(jsonRaw, pngDataUri) {
  const data = JSON.parse(jsonRaw);

  if (data.meta?.image) {
    data.meta.image = pngDataUri;
  } else if (data.meta?.images?.length) {
    data.meta.images[0] = pngDataUri;
  }

  const img = await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = pngDataUri;
  });

  const texture = Texture.from(img);

  const sheet = new Spritesheet({
    texture,
    data,
  });

  await sheet.parse();

  return sheet;
}
