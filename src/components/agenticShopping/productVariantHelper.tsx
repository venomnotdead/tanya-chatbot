/* eslint-disable @typescript-eslint/no-explicit-any */
/** -------- Variant helpers from your shared utilities -------- */
export const CURRENCY_PREF = "USD";

export const isVariantOnStock = (variant?: any): boolean => {
  const availability = variant?.availability;
  if (!availability) return false;
  const firstChannelAvail =
    availability.channels?.results?.[0]?.availability;

  if (firstChannelAvail) {
    return (
      firstChannelAvail.isOnStock === true &&
      (firstChannelAvail.availableQuantity ?? 0) > 0
    );
  }

  return false;
};


/** Prefer discounted price, prefer desired currency, with safe fallbacks */
export const pickVariantMoney = (variant: any, currencyPref = CURRENCY_PREF) => {
  const prices = variant?.prices ?? [];
  if (!prices.length) return null;

  const choose = (list: any[]): any => {
    const discountedFirst = list.find((p) => !!p.discounted?.value);
    if (discountedFirst) {
      return {
        cent: discountedFirst.discounted.value.centAmount,
        cur: discountedFirst.discounted.value.currencyCode,
        regularCent: discountedFirst.value?.centAmount,
      };
    }
    const normal = list[0]?.value;
    return normal ? { cent: normal.centAmount, cur: normal.currencyCode } : null;
  };

  const prefer = prices.filter(
    (p: any) => (p.discounted?.value || p.value)?.currencyCode === currencyPref
  );
  const picked = choose(prefer);
  if (picked) return picked;
  return choose(prices) || null;
};

/** Get attribute label (case-insensitive) */
export const getVariantAttributeLabel = (attributes: any[], name: string): string => {
  if (!Array.isArray(attributes)) return "";
  const attr =
    attributes.find((a) => a.name === name) ||
    attributes.find((a) => a.name?.toLowerCase() === name.toLowerCase());
  if (!attr || !attr.value) return "";
  return typeof attr.value === "object" ? attr.value.label || "" : attr.value;
};

export const getVariantStyleAndLabel = (attributes: any[]) => {
  let sizeLabel = "";
  if (Array.isArray(attributes)) {
    const sizeAttr =
      attributes.find((a) => a.name === "size") ||
      attributes.find((a) => a.name === "Size");
    if (sizeAttr && sizeAttr.value) {
      sizeLabel =
        typeof sizeAttr.value === "object"
          ? sizeAttr.value.label || ""
          : sizeAttr.value;
    }
  }
  return { sizeLabel };
};

export const getVariantColor = (v?: any) =>
  getVariantAttributeLabel(v?.attributesRaw ?? [], "color");

export const getVariantSize = (v?: any) =>
  getVariantStyleAndLabel(v?.attributesRaw ?? []).sizeLabel;

/** Find matching variant by color/size */
export const findVariantBy = (variants: any[], color?: string | null, size?: string | null) => {
  for (const e of variants) {
    const c = getVariantColor(e.variant);
    const s = getVariantSize(e.variant);
    const colorOk = color ? c === color : true;
    const sizeOk = size ? s === size : true;
    if (colorOk && sizeOk) return e;
  }
  return null;
};

export const getVariantAvailableQty = (variant: any): number | null => {
  if (!variant?.availability) return null;

  const channelResult =
    variant.availability.channels?.results &&
    variant.availability.channels.results[0];

  const channelQty = channelResult?.availability?.availableQuantity;

  if (typeof channelQty === "number") {
    return channelQty;
  }

  return null;
};
