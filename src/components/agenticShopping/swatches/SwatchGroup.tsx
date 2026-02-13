/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";

export const SwatchGroup = ({ label, selectedValue, onChange, children }) => {
  return (
    <div className="mb-6">
      <div className="font-medium text-lg mb-2">
        {label}:{" "}
        <span className="font-normal text-gray-700">{selectedValue || ""}</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">{children}</div>
    </div>
  );
};
