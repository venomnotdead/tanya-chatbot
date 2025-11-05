import css from "./index.css?inline";
import { useEffect } from "react";

export function TanyaChatbotProvider() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  return null;
}
