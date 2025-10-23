/* eslint-disable @typescript-eslint/no-explicit-any */
import { useDispatch } from "react-redux";
import type { SearchProduct } from "../graphQL/queries/types";
import {
  stringReducer,
  priceFormatter,
  currencyFormatter,
  displayData,
  imageUrlArray,
} from "../utils/helper";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useEffect, useState } from "react";
import { setProduct } from "../../store/reducers/productReducer";
import { getProductById } from "../utils";

function useResponsiveProductsPerPage() {
  const getProductsPerPage = () => {
    if (window.innerWidth < 425) return 1; // Below Mobile-L
    if (window.innerWidth < 768) return 2; // Mobile-L to md
    return 4; // md and above
  };

  const [productsPerPage, setProductsPerPage] = useState(getProductsPerPage);

  useEffect(() => {
    const handleResize = () => setProductsPerPage(getProductsPerPage());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return productsPerPage;
}

const ProductCarousel = ({
  product,
}: // storeDetails,
{
  product: SearchProduct[];
  storeDetails: any;
}) => {
  const dispatch = useDispatch();
  // const selectedProduct = useSelector((state: any) => state.product.product);
  const productsPerPage = useResponsiveProductsPerPage();
  const [startIndex, setStartIndex] = useState(0);

  const nextProducts = () => {
    setStartIndex((prevIndex) =>
      prevIndex + productsPerPage >= product.length
        ? 0
        : prevIndex + productsPerPage
    );
  };

  const prevProducts = () => {
    setStartIndex((prevIndex) =>
      prevIndex - productsPerPage < 0
        ? product.length - (product.length % productsPerPage || productsPerPage)
        : prevIndex - productsPerPage
    );
  };

  const getProduct = async (id: number | string) => {
    console.log('calling get product');
    const product = await getProductById(id);
    dispatch(setProduct(product));
  };

  return (
    <div className="mt-2 overflow-x-hidden">
      <div className="flex items-center justify-center gap-4 relative">
        {product?.length > productsPerPage && (
          <button
            onClick={prevProducts}
            className="absolute left-0 text-[#000000] bg-[#ffffff] rounded-full p-2 flex items-center h-fit"
            // style={{ color: storeDetails.tanyaThemeColor }}
          >
            <Icon icon="mdi:chevron-left" width="25" />
          </button>
        )}

        <div className="flex gap-5 justify-center flex-1 overflow-hidden">
          {product
            .slice(startIndex, startIndex + productsPerPage)
            .map((prod) => (
              <div
                key={prod.productId}
                className="flex-shrink-0 flex flex-col w-[150px] h-[200px] p-2 items-center justify-between cursor-pointer bg-[#FFFFFF] rounded-[10px] shadow-[0px_2px_2px_0px_#9292BC40]"
                onClick={() => {
                  getProduct(prod.product_id ?? prod.productId);
                }}
              >
                {/* Image */}
                <div className="w-full p-2 flex items-center justify-center bg-white">
                  <img
                    src={
                      imageUrlArray(prod)[0]?.link ||
                      imageUrlArray(prod)[0] || // fallback if it's a string
                      "https://via.placeholder.com/120"
                    }
                    alt={prod?.productName ? prod.productName : "Product"}
                    className="w-28 h-28 rounded-[10px] transition-transform duration-300 hover:scale-125 object-cover"
                  />
                </div>

                {/* Price & Name */}
                <div
                  className="text-white w-full p-2 text-[12px] text-center h-[60px]"
                  // style={{ background: storeDetails.tanyaThemeColor }}
                >
                  <div className="relative inline-block group">
                    <div className="w-full line-clamp-1 overflow-hidden text-ellipsis text-[#000000] font-medium font-nunitoSans">
                      {prod?.productName
                        ? prod.productName
                        : prod?.product_name
                        ? prod.product_name
                        : stringReducer(
                            displayData(prod?.name?.["en-US"]),
                            60
                          ) || "Product"}
                    </div>

                    {/* Tooltip */}
                    <div
                      className="absolute left-0 top-full mt-1 w-max max-w-[200px] p-2 bg-white shadow-lg text-black text-xs rounded opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-50 pointer-events-auto"
                      style={{
                        position: "absolute",
                        top: "-100%",
                        left: "0",
                        marginBottom: "5px",
                        zIndex: 50,
                      }}
                    >
                      {prod?.productName
                        ? prod.productName
                        : prod?.product_name
                        ? prod.product_name
                        : stringReducer(
                            displayData(prod?.name?.["en-US"]),
                            60
                          ) || "Product"}
                    </div>
                  </div>
                  <div className=" flex text-center items-center gap-2 text-[14px] text-[#14121F] font-bold font-nunitoSans text-base mb-1">
                    <p>
                      {currencyFormatter(
                        prod?.price
                          ? Number(prod?.price)
                          : priceFormatter(prod).centAmount || 0,
                        priceFormatter(prod)?.currencyCode
                      )}
                    </p>
                    <p className="text-[#14121F] font-normal line-through text-sm font-nunitoSans">
                      ${Number(prod?.price).toFixed(2) ?? 0 + 5}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {product?.length > productsPerPage && (
          <button
            onClick={nextProducts}
            className="absolute right-0 text-[#000000] bg-[#ffffff] rounded-full p-2  flex items-center h-fit"
            // style={{ color: storeDetails.tanyaThemeColor }}
          >
            <Icon icon="mdi:chevron-right" width="25" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCarousel;
