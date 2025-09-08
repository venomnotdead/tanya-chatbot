import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Store } from "../../components/graphQL/queries/types";

interface StoreState {
  store?: Store;
}

const initialState: StoreState = {
  store: {
    storeCode: "",
    storeName: "",
    storeDescription: "",
    activeCatalogId: 0,
    isDefault: false,
    logoDarkBg: "",
    logoLightBg: "",
    logoTransparent: "",
    catalogs: [],
    themeColor: "",
    themeContrastColor: "",
    tanyaThemeColor: "",
    tanyaThemeColorLight: "",
    favicon: "",
    websiteTitle: "",
    flowId: "",
    aliasId: "",
    searchConfigs: {
      endpoint: "",
      accessKey: "",
      secretKey: "",
    },
    homePageCategories: [],
    carouselImages: {
      web: [],
      mobile: [],
    },
    otherImages: {
      web: [],
      mobile: [],
    },
  },
};

export const storeSlice = createSlice({
  name: "store",
  initialState,
  reducers: {
    setStore: (state, action: PayloadAction<Store>) => {
      state.store = action.payload;
    },
  },
});

export const { setStore } = storeSlice.actions;

export default storeSlice.reducer;
