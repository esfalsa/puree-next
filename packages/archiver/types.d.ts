declare type RegionData = {
  time: number | null;
  factbook: string | null;
  flagId: string | null;
  flag: string | null;
  bannerId: string | null;
  banner: string | null;
  embassies: string[];
  officers: Officer[];
};

/**
 * The `RegionData` available to collect from the data dump.
 */
declare type ParserRegionData = Omit<RegionData, "flag" | "banner" | "time">;

declare type ParserRegionDataEvent = {
  region: string;
  data: ParserRegionData;
};

declare type Officer = {
  nation?: string;
  office?: string;
  authority?: string;
};

// declare
