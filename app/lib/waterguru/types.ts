type WaterGuruDashboard = {
  rspType: string;
  code: string;
  lastModified: string;
  status: string;
  waterBodies: WaterGuruWaterBodyView[];
  waterBodyIdToIndex: Record<string, number>;
  statusColors: WaterGuruStatusColors;
  contact: WaterGuruContactInfo;
  specialOffers: unknown[];
  storeUrl: string;
  buyTestKitUrl: string;
  buySensorUrl: string;
  helpUrl: string;
};
type WaterGuruStatusColors = {
  GREEN: string;
  YELLOW: string;
  RED: string;
};
type WaterGuruContactInfo = {
  web: string;
  supportWeb: string;
  supportEmail: string;
  supportPhone: string;
};
type WaterGuruWaterBodyView = {
  viewType: string;
  status: keyof WaterGuruStatusColors;
  firstAlertCondition?: string;
  alerts: WaterGuruAlertView[];
  waterBody: WaterGuruWaterBody;
  waterBodyId: string;
  name: string;
  waterTemp: number;
  waterTempTime: string;
  waterTempTimeHuman: string;
  freeClTargetEffective: number;
  freeClTargetEffectiveDec: string;
  phTargetEffective: number;
  phTargetEffectiveDec: string;
  flowGpmTargetEffective: number;
  taTargetEffective: number;
  chTargetEffective: number;
  cyaTargetEffective: number;
  saltTargetEffective: number;
  pods: WaterGuruPodView[];
  latestMeasureTime: string;
  latestMeasureTimeHuman: string;
  measurements: WaterGuruMeasurementView[];
  adviceUrl: string;
  equipmentUrl: string;
  sanitizerType: string;
};
type WaterGuruAlertView = {
  category: string;
  source: string;
  condition: string;
  icon: string;
  status: keyof WaterGuruStatusColors;
  color: string;
  text: string;
  advice?: WaterGuruAdvice;
};
type WaterGuruWaterBody = {
  waterBodyId: string;
  userId: string;
  createTime: string;
  label: string;
  sizeGallons: number;
  sizeGallonsManual: boolean;
  measDoseHr: number;
  measDoseMin: number;
  measDoseHrMinModified: string;
  measDoseTimes: {
    hour: number;
    minute: number;
  }[];
  type: string;
  surface: string;
  filterType: string;
  userCl: string;
  userTrich: string;
  userClLiq: string;
  userClLiqProductPct: number;
  userAcid: string;
  userAcidMuriaticPct: number;
  cover: string;
  addr1: string;
  city: string;
  state: string;
  zip: string;
  imageUrl: string;
};
type WaterGuruPodView = {
  pod: WaterGuruPod;
  podId: number;
  refillables: WaterGuruRefillable[];
  rssiInfo?: WaterGuruRssiInfo;
};
type WaterGuruMeasurementView = {
  viewType: string;
  status: keyof WaterGuruStatusColors;
  type: string;
  title: string;
  value: string;
  floatValue?: number;
  intValue?: number;
  measureTime: string;
  measureTimeHuman: string;
  color: string;
  cfg: WaterGuruMeasurementConfig;
  target?: number;
  alerts?: WaterGuruAlertView[];
  firstAlertCondition?: string;
};
type WaterGuruAdvice = {
  url: string;
  miscData: {
    [key: string]: {
      strVal: string;
      floatVal: number;
    };
  };
  action: {
    summary: string;
    addChemical: {
      label: string;
      shopProduct: {
        id: number;
        productName: string;
        price: number;
        thumbUrl: string;
        sku: string;
      };
      shopProductCount: number;
      productActionType: "AdviceAddChemical";
      asVolume: {
        unit: string;
        unitLabel: string;
        concentrationPct?: {
          strVal: string;
          floatVal: number;
        };
        amount: {
          strVal: string;
          floatVal: number;
        };
      };
      chemical: string;
    };
  };
};
type WaterGuruPod = {
  podId: number;
  shortBleId: string;
  bleId: string;
  opsNotes: unknown[];
  userId: string;
  waterBodyId: string;
  createTime: string;
  lastCxnTime: string;
  setUpTime: string;
  ipAddr: string;
  wifiId: string;
  product: string;
  fwSeries: string;
  fwUpdateVersion: string;
  fwUpdateVersionPush: boolean;
  fwUpdateLinkPushes: unknown[];
  fwUpdateInstalls: string[];
  fwUpdateBranch: string;
  fwGoldenLinkPushes: unknown[];
  fwGoldenInstalls: unknown[];
  fwBleVersion: string;
  fwBleLinkPushes: unknown[];
  fwBleInstalls: string[];
  cfgPush: boolean;
  freeClTarget: number;
  phTarget: number;
  sizeGal: number;
  measAutoHrs: number;
  measDoseTimes: {
    hour: number;
    minute: number;
  }[];
  freeClDoseDailyLim: number;
  measDelayMins: number;
  flowDeltaThreshold: number;
  flowSensorRefOhms: number;
  pumpScanState: string;
  pumpScanPendingTime: string;
  pumpScanIntervalMins: number;
  pumpScanNumCycles: number;
  doCmdCron: unknown[];
  remotePowerType: number;
};
type WaterGuruRefillable = {
  viewType: string;
  status: keyof WaterGuruStatusColors;
  type: string;
  color: string;
  label: string;
  maxAmount?: string;
  amountLeft: string;
  unit: string;
  timeLeftText?: string;
  pctLeft?: number;
  pctLeftDec?: string;
  urgent?: boolean;
  refillTime?: string;
};
type WaterGuruRssiInfo = {
  rssi: number;
  rssiTime: string;
  bars: number;
  desc: string;
  tip: string;
};
type WaterGuruMeasurementConfig = {
  dataType: string;
  abbrev: string;
  queryParam: string;
  unit?: string;
  srcScale?: number;
  decPlaces?: number;
  example?: string;
  floatRanges?: Record<string, number>;
  intRanges?: Record<string, number>;
  ranges?: Record<string, string>;
  deltas?: unknown[];
  validDays?: number;
  validRange?: {
    MIN: number;
    MAX: number;
  };
  averagedValueValidRange?: {
    MIN: number;
    MAX: number;
  };
};
type WaterGuruResponse = {
  pools?: unknown[];
  devices?: unknown[];
  [key: string]: unknown;
};
type WgTokens = {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
};

export type {
  WaterGuruAdvice,
  WaterGuruAlertView,
  WaterGuruContactInfo,
  WaterGuruDashboard,
  WaterGuruMeasurementConfig,
  WaterGuruMeasurementView,
  WaterGuruPod,
  WaterGuruPodView,
  WaterGuruRefillable,
  WaterGuruResponse,
  WaterGuruRssiInfo,
  WaterGuruStatusColors,
  WaterGuruWaterBody,
  WaterGuruWaterBodyView,
  WgTokens,
};
