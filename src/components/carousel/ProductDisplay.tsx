/* eslint-disable @typescript-eslint/no-explicit-any */
import ProductCarousel from "./ProductCarousel";
import { initialCapital } from "../utils/helper";

const ProductDisplay = ({ chat, storeDetails }: any) => {
  return (
    <div className="bg-[#FFFFFF] px-7 py-4 rounded-r-xl rounded-bl-2xl w-full">
      {chat.map((products: any, i: number) => (
        <div
          key={i}
          className="mb-4 p-3 rounded-xl"
          style={{ 
            background: "linear-gradient(109.52deg, #F0EEF5 36.91%, #F4F3EE 100.34%",
            // backgroundColor: storeDetails.tanyaThemeColorLight 
          }} // slightly darker grey // light grey section bg
        >
          <div
            className="font-nunitoSans font-bold text-sm text-[#494949] p-2 w-fit rounded-[20px]"
            // style={{
            //   color: storeDetails?.tanyaThemeContrastColor,
            //   border: `1px solid ${storeDetails.tanyaThemeColor}`,
            //   backgroundColor: storeDetails.tanyaThemeColor,
            // }}
          >
            {initialCapital(products.keyword) || "No keyword"}
          </div>

          <ProductCarousel
            product={products.items}
            storeDetails={storeDetails}
          />
        </div>
      ))}
    </div>
  );
};

export default ProductDisplay;
