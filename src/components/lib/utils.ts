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

      // any other data SFCC needs
    },
  });
  window.dispatchEvent(event);
};
