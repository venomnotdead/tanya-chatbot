export interface Category {
  id: string;
  key: string;
  name: string; // Now a string type for the localized name
  categoryId: string;
  children?: Category[];
  requestParam?: number[];
}

export interface CategoriesResponse {
  categories: {
    total: number;
    results: Category[];
  };
}

export interface Product {
  id: string;
  key: string;
  title: string;
  description?: string;
  quantity?: number;
  masterVariant: {
    prices: {
      value: {
        currencyCode: string;
        centAmount: number;
      };
    }[];
    images: Image[];
  };
  image?: string;
  price?: number;
  category: string;
}

export interface Image {
  url: string;
}

export interface ProductsByCategoryResponse {
  productProjectionSearch: {
    offset: number;
    total: number;
    count: number;
    results: Product[];
  };
}
export interface LocalizedString {
  "de-DE": string;
  "en-GB": string;
  "en-US": string;
}

export interface CategoryHierarchy {
  lvl0: string[];
  lvl1: string[];
  lvl2: string[];
}

export interface CategoryKeys {
  "de-DE": string[];
  "en-GB": string[];
  "en-US": string[];
}

export interface Variant {
  id: string;
  key: string;
  sku: string;
  attributes: {
    color: LocalizedString;
    finish?: LocalizedString;
  };
  searchableAttributes: {
    color: LocalizedString;
  };
  images: string[];
  prices: {
    [currency: string]: {
      min: number;
      max: number;
      priceValues: {
        id: string;
        value: number;
      }[];
    };
  };
  isInStock: boolean;
  inventory: {
    [channel: string]: number;
  };
}

export interface SearchProduct {
  productType: string;
  name: LocalizedString;
  product_name: String;
  description: LocalizedString;
  key: string;
  slug: LocalizedString;
  categories: {
    "de-DE": CategoryHierarchy;
    "en-GB": CategoryHierarchy;
    "en-US": CategoryHierarchy;
  };
  categoryKeys: CategoryKeys;
  attributes?: {
    productspec: LocalizedString;
  };
  createdAt: string;
  masterVariantID: string;
  categoryPageId: string[];
  variantIDs: string[];
  _tags: string[];
  variants: Variant[];
  objectID: string;
  title?: string;
  price?: string;
  categoryId?: string;
  id?: number,
  product_id?: number | string,
  category?: string, 
}

export type UpdatePaymentType = {
  id: string;
  version: number;
  transactionId: string;
  fields: Field[];
};

export type Field = {
  name: string;
  value: string;
};

export type Cart = {
  id: string;
  typeId: string;
};

export type Address = {
  key: string;
  id: string;
  firstName: string;
  lastName: string;
  streetName: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
};

export type AddItemShippingAddressAction = {
  addItemShippingAddress: {
    address: Address;
  };
};

export type Action = AddItemShippingAddressAction;

export type AddressInputData = {
  version: number;
  id: string;
  actions: Action[];
};

export interface Store {
  storeCode: string;
  storeName: string;
  storeDescription: string;
  activeCatalogId: number;
  isDefault: boolean;
  logoDarkBg: string;
  logoLightBg: string;
  logoTransparent: string;
  catalogs: number[];
  themeColor: string;
  themeContrastColor: string;
  tanyaThemeColor: string;
  tanyaThemeColorLight: string;
  favicon: string;
  websiteTitle: string;
  flowId: string;
  aliasId: string;
  searchConfigs: SearchConfig;
  homePageCategories: homePageCategories[];
  carouselImages: {
    web: string[];
    mobile: string[];
  };
  otherImages: {
    web: string[];
    mobile: string[];
  };
}

export interface homePageCategories {
  categoryID: number;
  carouselTitle: string;
}

export interface SearchConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
}
