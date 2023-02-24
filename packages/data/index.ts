import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { request } from "undici";
import { Parser, RegionSaver } from "archiver";
import * as dotenv from "dotenv";

dotenv.config();

const userAgent = "Region Archiver/0.1.0 (by: Esfalsa)";

const { body } = await request(
  "https://esfalsa.github.io/puree/regions.xml.gz",
  {
    headers: {
      "user-agent": userAgent,
    },
  }
);

const passworded: string[] =
  (
    await request(
      "https://www.nationstates.net/cgi-bin/api.cgi?q=regionsbytag;tags=password",
      {
        headers: {
          "user-agent": userAgent,
        },
      }
    ).then(({ body }) => body.text())
  )
    .split("<REGIONS>")[1]
    ?.split("</REGIONS>")[0]
    ?.split(",") ?? [];

const timer = new AbortController();

// abort after one hour
setTimeout(() => {
  timer.abort();
}, 60 * 60 * 1000);

pipeline(
  body,
  createGunzip(),
  new Parser({
    filter: ({ name, delegateAuth }) =>
      Boolean(delegateAuth?.includes("X") && !passworded.includes(name)),
  }),
  new RegionSaver({ userAgent }),
  {
    signal: timer.signal,
  }
);
