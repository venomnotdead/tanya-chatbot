import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const notifySFCC = (basketId?: string) => {
  const event = new CustomEvent("reactCartUpdated", {
    detail: {
      cartUpdated: true,
      basketId,
    },
  });
  window.dispatchEvent(event);
};

export const findImageGroupBy = (imageGroups = [], options: any) => {
  console.log(options,'the option');
  let { viewType, selectedVariationAttributes = {} } = options;

  // Start by filtering out any imageGroup that isn't the correct viewType.
  imageGroups = imageGroups.filter(
    ({ viewType: imageGroupViewType }) => imageGroupViewType === viewType
  );

  // Not all variation attributes are reflected in images. For example, you probably
  // won't have a separate image group for various sizes, but you might for colors. For that
  // reason we need to know what are valid attribute values to filter on.
  const refinableAttributeIds = [
    ...new Set(
      imageGroups
        .reduce(
          (acc, { variationAttributes = [] }) => [
            ...acc,
            ...variationAttributes,
          ],
          []
        )
        .map(({ id }) => id)
    ),
  ];

  // Update the `selectedVariationAttributes` by filtering out the attributes that have no
  // representation in this imageGroup.
  selectedVariationAttributes = Object.keys(selectedVariationAttributes).reduce(
    (acc, curr) => {
      return refinableAttributeIds.includes(curr)
        ? {
            ...acc,
            [`${curr}`]: selectedVariationAttributes[curr],
          }
        : acc;
    },
    {}
  );

  // Find the image group that has all the all the selected variation value attributes.
  imageGroups = imageGroups.find(({ variationAttributes = [] }) => {
    const selectedIds = Object.keys(selectedVariationAttributes);

    return selectedIds.every((selectedId) => {
      const selectedValue = selectedVariationAttributes[selectedId];

      return variationAttributes.find(
        ({ id, values }) =>
          id === selectedId &&
          values.every(({ value }) => value === selectedValue)
      );
    });
  });

  return imageGroups;
};
