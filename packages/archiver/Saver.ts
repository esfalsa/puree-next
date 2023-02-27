import { Writable, WritableOptions } from "node:stream";
import PQueue from "p-queue";
import fs from "fs-extra";
import _ from "lodash";
import { request } from "undici";

export class RegionSaver extends Writable {
  date = Math.floor(Date.now() / 1000); // get Unix time, in seconds
  userAgent: string;
  host: string;

  queue = new PQueue({
    interval: 6000,
    intervalCap: 1,
    concurrency: 1,
  });

  constructor(options: WritableOptions & { userAgent: string; host: string }) {
    super({ ...options, objectMode: true });
    this.userAgent = options.userAgent;
    this.host = options.host;

    fs.ensureDirSync("./flags");
    fs.ensureDirSync("./banners/uploads");
  }

  override async _write(
    chunk: ParserRegionDataEvent,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    await this.saveRegion(chunk.region, chunk.data);
    callback();
  }

  async saveRegion(name: string, data: ParserRegionData) {
    const filename = `./data/${name.toLowerCase().replaceAll(" ", "_")}.json`;

    await fs.ensureFile(filename);
    const currentData: RegionData[] =
      (await fs.readJSON(filename, { throws: false })) ?? [];

    const { time, flag, banner, ...lastData }: RegionData = currentData.at(
      -1
    ) || {
      time: null,
      factbook: null,
      flagId: null,
      flag: null,
      bannerId: null,
      banner: null,
      embassies: [],
      officers: [],
    };

    if (_.isEqual(lastData, data)) return;

    const newData: RegionData = {
      ...data,
      time: this.date,
      flag:
        data.flagId && data.flagId !== lastData.flagId
          ? (await this.#getFlag(data.flagId)) || null
          : null,
      banner:
        data.bannerId && data.bannerId !== lastData.bannerId
          ? (await this.#getBanner(data.bannerId)) || null
          : null,
    };

    await fs.outputJSON(filename, [...currentData.slice(-3), newData]);
  }

  async #getFlag(id: string) {
    return await this.queue.add(async (): Promise<string | null> => {
      const downloadResponse = await request(
        new URL(
          id,
          "https://www.nationstates.net/images/flags/uploads/rflags/"
        ),
        {
          headers: {
            "user-agent": "Region Archiver/0.1.0 (by: Esfalsa)",
          },
        }
      );

      if (downloadResponse.statusCode !== 200) {
        return null;
      }

      downloadResponse.body.pipe(fs.createWriteStream(`./flags/${id}`));

      return `${this.host}/flags/${id}`;
    });
  }

  async #getBanner(id: string) {
    if (/r\d+?\.jpg/.test(id)) {
      return new URL(id, "https://www.nationstates.net/images/rbanners/").href;
    }

    return await this.queue.add(async (): Promise<string | null> => {
      const downloadResponse = await request(
        new URL(id, "https://www.nationstates.net/images/rbanners/"),
        {
          headers: {
            "user-agent": "Region Archiver/0.1.0 (by: Esfalsa)",
          },
        }
      );

      if (downloadResponse.statusCode !== 200) {
        return null;
      }

      downloadResponse.body.pipe(fs.createWriteStream(`./banners/${id}`));

      return `${this.host}/banners/${id}`;
    });
  }
}
