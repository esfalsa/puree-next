import { Transform, TransformCallback, TransformOptions } from "node:stream";
import {
  CDataHandler,
  CloseTagHandler,
  OpenTagHandler,
  SaxesParser,
  SaxesTagPlain,
  TextHandler,
} from "saxes";

type RegionFilter = (
  data: ParserRegionData & { name: string; delegateAuth: string | null }
) => boolean;

/**
 * Transforms a stream of a daily dump into a stream of region objects.
 */
export class Parser extends Transform {
  parser: SaxesParser = new SaxesParser();
  currentRegion: string | null = null;
  currentDelegateAuth: string | null = null;
  currentOfficer: Officer = {};
  currentData: ParserRegionData = {
    factbook: null,
    flagId: null,
    bannerId: null,
    embassies: [],
    officers: [],
  };
  state: string | null = null;
  attributes: SaxesTagPlain["attributes"] | null = null;
  filter: RegionFilter | null;

  constructor(options?: TransformOptions & { filter?: RegionFilter }) {
    super({ ...options, readableObjectMode: true });

    this.parser.on("opentag", this.#handleOpenTag);
    this.parser.on("text", this.#handleText);
    this.parser.on("cdata", this.#handleCData);
    this.parser.on("closetag", this.#handleCloseTag);

    this.filter = options?.filter || null;
  }

  override _transform(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    this.parser.write(chunk.toString());
    callback();
  }

  #handleOpenTag: OpenTagHandler<{}> = ({ name, attributes }) => {
    this.state = name;
    this.attributes = attributes;
  };

  #handleText: TextHandler = (text) => {
    if (!this.state) return;

    switch (this.state) {
      case "NAME":
        this.currentRegion = text;
        break;
      case "DELEGATEAUTH":
        this.currentDelegateAuth = text;
        break;
      case "FLAG":
        this.currentData.flagId = text.split("/").at(-1) || null;
        break;
      case "BANNERURL": // use BANNERURL since BANNER is sometimes 0 if no custom banner is set
        this.currentData.bannerId =
          text.replace("/images/rbanners/", "") || null;
        break;
      case "EMBASSY":
        const type = this.attributes?.["type"];
        if (!type || type === "pending") {
          this.currentData.embassies.push(text);
        }
        break;
      case "NATION": // regional officer nation
        this.currentOfficer.nation = text;
        break;
      case "OFFICE": // regional officer office
        this.currentOfficer.office = text;
        break;
      case "AUTHORITY": // regional officer authority
        this.currentOfficer.authority = text;
        break;
    }
  };

  #handleCData: CDataHandler = (cdata) => {
    if (this.state === "FACTBOOK") {
      this.currentData.factbook = cdata;
    }
  };

  #handleCloseTag: CloseTagHandler<{}> = (tag) => {
    this.state = null;

    if (tag.name === "REGION" && this.currentRegion) {
      if (
        this.filter &&
        this.filter({
          name: this.currentRegion,
          delegateAuth: this.currentDelegateAuth,
          ...this.currentData,
        })
      ) {
        this.push({
          region: this.currentRegion,
          data: this.currentData,
        });
      }

      this.currentRegion = null;
      this.currentData = {
        factbook: null,
        flagId: null,
        bannerId: null,
        embassies: [],
        officers: [],
      };
      this.currentOfficer = {};
    } else if (tag.name === "OFFICER") {
      this.currentData.officers.push(this.currentOfficer);
      this.currentOfficer = {};
    }
  };
}
