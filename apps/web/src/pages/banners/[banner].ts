import type { APIRoute } from "astro";
import { readFile, readdir } from "node:fs/promises";

export const get: APIRoute = async ({ params }) => {
  const banner = await readFile(
    `./node_modules/data/banners/uploads/${params.banner}`
  );

  return new Response(banner);
};

export async function getStaticPaths() {
  return (await readdir("./node_modules/data/banners/uploads")).map((file) => ({
    params: {
      banner: file,
    },
  }));
}
