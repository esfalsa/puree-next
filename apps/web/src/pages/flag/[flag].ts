import type { APIRoute } from "astro";
import { readFile, readdir } from "node:fs/promises";

export const get: APIRoute = async ({ params }) => {
  const image = await readFile(`./node_modules/data/flags/${params.flag}`);

  return new Response(image);
};

export async function getStaticPaths() {
  return (await readdir("./node_modules/data/flags")).map((file) => ({
    params: {
      flag: file,
    },
  }));
}
