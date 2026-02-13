/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

export const Swatch = ({
  value,
  name,
  variant = "square",
  image,
  selected,
  onClick,
}) => {
  const size =
    variant === "circle" ? "h-12 w-12 rounded-full" : "h-12 w-12 rounded-md";

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center border p-2
        ${size}
        bg-white cursor-pointer relative
        ${selected ? "border-black" : "border-gray-300 hover:border-gray-500"}
      `}
    >
      {variant === "circle" ? (
        <div
          className="h-full w-full rounded-full"
          style={{
            backgroundImage: `url(${image?.disBaseLink || image?.link || ""})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: name?.toLowerCase(),
          }}
        />
      ) : (
        <span className="text-base font-medium">{name}</span>
      )}

      {selected && variant === "circle" && (
        <div className="absolute inset-0 rounded-full border-2 border-black pointer-events-none" />
      )}
    </button>
  );
};
