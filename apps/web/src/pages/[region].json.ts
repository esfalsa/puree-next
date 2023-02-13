import type { APIRoute } from "astro";
import { readdir } from "node:fs/promises";

export const get: APIRoute = async ({ params }) => {
  const data = await import(
    `../../node_modules/data/data/${params.region}.json`
  );

  return {
    body: JSON.stringify(data),
  };
};

export async function getStaticPaths() {
  return (await readdir("./node_modules/data/data")).map((file) => ({
    params: {
      region: file.split(".")[0],
    },
  }));
}
