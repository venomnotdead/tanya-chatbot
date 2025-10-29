/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"; // Add useMemo here when uncomment the color, size, width code
// import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon } from "@iconify/react";
import { setProduct } from "../../store/reducers/productReducer";
import { addProductToBasket, createBasket, fetchBasket } from "../api/api";
// import { fetchTokenSFCC } from "../utils/fetchTokenSFCC";
import {
  getStoredBasketId,
  // getStoredToken,
  setStoredBasketId,
  setStoredToken,
} from "../utils/localStorage";
import { toast } from "react-toastify";
import { TOKEN_EXPIRY_KEY } from "../../config/constant";
import { fetchTokenBmGrant } from "../utils/fetchTokenBmGrant";
import {
  // fetchExistingRegisterCustomerToken,
  fetchExistingGuestCustomerToken,
} from "../utils/fetchExistingRegisterCustomerToken";
import { notifySFCC } from "../lib/utils";
import { authData } from "../../sfcc-apis/session";

const ANIMATION_DURATION = 300; // ms

const ProductDisplayCard = () => {
  const dispatch = useDispatch();
  const product = useSelector((state: any) => state.product.product);
  const storeDetails = useSelector((s: any) => s.store.store);
  const [show, setShow] = useState(!!product);

  useEffect(() => {
    setShow(!!product);
  }, [product]);

  if (!product) return null;

  // const { sizeAttr, colorAttr, widthAttr } = attributes;

  const addToCart = async () => {
    console.log(product, "the prod");
    try {
      // Check if product and variants exist

      if (
        !product?.variants?.[0]?.product_id &&
        !(product.type.item || product.type.bundle) &&
        !product?.variants?.[0]?.productId
      ) {
        toast.error("Variants not available", {
          position: "bottom-right",
          autoClose: 1000,
        });
        console.error("No product variant found");
        return;
      }

      const productData = [
        {
          product_id:
            product.variants?.[0].product_id ||
            product.variants?.[0].productId ||
            product?.id,
          quantity: 1,
        },
      ];
      console.log(productData, "the product data");
      // for getting customer id
      const customerData = JSON.parse(
        sessionStorage.getItem("customerData") || "{}"
      );
      const basketIdFromCustomer = customerData?.basketId;
      const customer_token = false;
      const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      const currentTime = Date.now();

      // If no token, get a new one
      if (
        !customer_token ||
        !tokenExpiry ||
        currentTime >= parseInt(tokenExpiry)
      ) {
        let customer_token = "";
        if (import.meta.env.VITE_SCAPI_ENVIRONMENT) {
          const authDetails = await authData();
          console.log("token from auth data");
          customer_token = "Bearer " + authDetails.access_token;
        } else {
          console.log("token from bm grant");
          const access_token = await fetchTokenBmGrant();
          const customerTokenData = await fetchExistingGuestCustomerToken(
            access_token
          );
          customer_token = customerTokenData.customer_token;
        }
        if (!customer_token) {
          console.error("Failed to get customer_token");
          return;
        }
        const newExpiryTime = currentTime + 5 * 60 * 1000;
        setStoredToken(customer_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiryTime.toString());

        // 1. Try basketId from customerData
        if (basketIdFromCustomer) {
          const fetchBasketResponse = await fetchBasket({
            basketId: basketIdFromCustomer,
            customer_token,
          });
          console.log(basketIdFromCustomer, "basket id from customer");
          if (fetchBasketResponse.status === 200 && fetchBasketResponse) {
            // Use this basketId to add product

            const response = await addProductToBasket(
              basketIdFromCustomer,
              productData,
              customer_token
            );
            if (
              response?.product_items?.length > 0 ||
              response?.productItems?.length > 0
            ) {
              // const addedProduct = response.product_items.at(-1);
              toast.success(`Added to cart`, {
                position: "bottom-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
              notifySFCC(basketIdFromCustomer);
              // window.location.reload();
            }
            return; // Skip basket creation
          }
        }

        // 2. If not valid, create new basket and store its ID in localStorage
        const data = {
          productItems: [
            {
              productId:
                product.variants?.[0].product_id ||
                product.variants?.[0].productId ||
                product?.id,
              quantity: 1,
            },
          ],
        };
        console.log("before create basket");
        const basketResponse = await createBasket(customer_token, data);
        console.log(
          basketResponse,
          basketResponse?.basket_id,
          basketResponse?.basketId,
          "the basket response"
        );
        if (!basketResponse?.basket_id && !basketResponse?.basketId) {
          console.error("Failed to create basket");
          return;
        }
        console.log(
          "setting stored id",
          basketResponse?.basket_id || basketResponse?.basketId
        );
        // else if (basketResponse?.basketId) {
        //   toast.success(`Added to cart`, {
        //     position: "bottom-right",
        //     autoClose: 3000,
        //     hideProgressBar: false,
        //     closeOnClick: true,
        //     pauseOnHover: true,
        //     draggable: true,
        //   });
        // }
        setStoredBasketId(
          basketResponse?.basket_id || basketResponse?.basketId
        );
        // Add product to new basket
        // if (!import.meta.env.VITE_SCAPI_ENVIRONMENT) {
        console.log("adding product to basket");
        const response = await addProductToBasket(
          basketResponse?.basket_id || basketResponse?.basketId,
          productData,
          customer_token
        );
        console.log("object added to basket");
        if (
          response?.product_items?.length > 0 ||
          response?.productItems?.length > 0
        ) {
          toast.success(`Added to cart`, {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
        notifySFCC(basketResponse.basket_id || basketResponse?.basketId);
        // }
      } else {
        // Use existing customer_token and basket ID
        const basketId = getStoredBasketId();
        if (!basketId) {
          console.error("No basket ID found");
          return;
        }

        const response = await addProductToBasket(
          basketId,
          productData,
          customer_token
        );
        if (response?.product_items?.length > 0) {
          toast.success(`Added to cart`, {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          notifySFCC(basketId);
        }
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add product to cart", {
        position: "bottom-right",
        autoClose: 3000,
      });

      if (
        error?.response?.status === 404 || // Basket not found
        error?.response?.status === 401 // Unauthorized/expired
      ) {
        // Clear only basket ID for 404
        if (error?.response?.status === 404) {
          setStoredBasketId(null);
        }
        // Clear both for 401
        if (error?.response?.status === 401) {
          setStoredBasketId(null);
          setStoredToken(null);
        }
      } else {
        console.error("Failed to add product to basket:", error.message);
        toast.error("Failed to add product to cart", {
          position: "bottom-right",
          autoClose: 3000,
        });
      }
    } finally {
      notifySFCC();
    }
  };

  // Function to generate and redirect to the product detail page
  const viewMore = () => {
    if (!product) return;

    window.location.href = product.c_pdpUrl; //redirect to sfcc product details url
  };
  console.log(product, "the prod");
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={() => {
          setShow(false);
          setTimeout(() => dispatch(setProduct(null)), ANIMATION_DURATION);
        }}
      />
      <div
        className={`
          flex flex-col gap-2 items-center h-[90vh] absolute right-0 bottom-0 z-50 w-full md:w-1/2 md:h-[100vh] lg:w-1/2 lg:h-[100vh] shadow-xl p-2 border-l-2 bg-white border-gray-200 overflow-y-scroll
          transition-all duration-300
          ${
            show
              ? "translate-y-0 md:translate-y-0 md:translate-x-0 opacity-100"
              : "translate-y-full md:translate-y-0 md:translate-x-full opacity-0 pointer-events-none"
          }
        `}
        style={{ willChange: "transform, opacity" }}
        // Prevent click inside card from closing
        onClick={(e) => e.stopPropagation()}
      >
        {/* name and close button  */}
        <div className="mt-3 flex flex-row justify-between w-full ">
          <div>
            <p className="text-[#000000] font-bold font-nunitoSans">
              {product.name}
            </p>
          </div>
          <div>
            <Icon
              icon="mdi:close"
              className="text-[#555555] w-6 h-6 cursor-pointer"
              onClick={() => {
                setShow(false);
                setTimeout(
                  () => dispatch(setProduct(null)),
                  ANIMATION_DURATION
                );
              }}
            />
          </div>
        </div>
        {/* image and variants */}
        <div className="flex flex-row gap-2 items-center flex-wrap">
          <div className="flex flex-row items-center justify-center  w-[120px] h-[120px] my-5">
            <img
              src={
                import.meta.env.VITE_SCAPI_ENVIRONMENT
                  ? product.imageGroups?.[0]?.images?.[0]?.link
                  : product.image_groups?.[0]?.images?.[0]?.link ||
                    "https://via.placeholder.com/120"
              }
              alt={product.name}
              className="rounded-[10px]"
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            {(import.meta.env.VITE_SCAPI_ENVIRONMENT
              ? product.imageGroups
              : product.image_groups
            )
              .slice(1, 2)
              .map((group: any) =>
                group.images.slice(1, 2).map((image: any) => (
                  <img
                    key={image.link}
                    src={image.link}
                    alt={product.name}
                    className="rounded-[10px] w-[60px] h-[60px]"
                  />
                ))
              )}
          </div>
        </div>
        {/* price and discount */}
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-row items-center gap-2">
            <p className="text-[#14121F] font-bold font-nunitoSans">
              {" "}
              ${product.price.toFixed(2)}
            </p>{" "}
            <p className="text-[#14121F] font-normal line-through text-sm font-nunitoSans">
              {" "}
              ${(product.price + 5).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[#EC5050] font-bold font-nunitoSans">
              {product.discount}
            </p>
          </div>
        </div>
        {/* horizontal line */}
        <div className="mt-2 w-full border-t-2 border-gray-200"></div>
        <div className="w-full text-left">
          <div className="text-[#323135] font-bold font-nunitoSans mt-3 text-[14px]">
            Product Details
          </div>
          <div
            className="text-[#68656E] font-normal font-nunitoSans text-xs pl-2 mt-3"
            dangerouslySetInnerHTML={{ __html: product.short_description || product.longDescription }}
          ></div>
        </div>
        {/* rating and reviews */}
        <div className="mt-4 flex flex-col gap-2 w-full p-2">
          <div className="flex flex-row items-center gap-2">
            <div className="flex items-center gap-2 text-left font-nunitoSans">
              <div className="text-[#323135] font-bold">
                {product?.rating?.rate || 0} /{" "}
                <span className="text-[#68656E]">5</span>
              </div>
              <div className="text-[#323135] font-semibold text-sm">
                Overall Rating
              </div>
              <div className="text-[#68656E] font-semibold text-sm">
                {product?.rating?.count || 0} ratings
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-row items-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Icon
                key={index}
                icon="mdi:star"
                width="20"
                height="20"
                className={`text-yellow-500 
                ${
                  product?.rating?.rate > index
                    ? "text-yellow-500"
                    : "text-gray-300"
                }
              `}
              />
            ))}
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-between font-nunitoSans font-semibold w-5/6 text-black gap-2"
          style={{ marginTop: "150px" }}
        >
          <button
            className="rounded-[5px] shadow-sm text-[#FBFBFC] bg-[#6851C6] p-2 w-full text-center cursor-pointer"
            style={{ backgroundColor: storeDetails.tanyaThemeColor }}
            onClick={addToCart}
          >
            Add to Cart
          </button>
          <button
            className="rounded-[5px] shadow-sm text-[#FBFBFC] bg-[#6851C6] p-2 w-full text-center cursor-pointer mb-16"
            style={{ backgroundColor: storeDetails.tanyaThemeColor }}
            onClick={viewMore}
          >
            View more
          </button>
        </div>
      </div>
    </>
  );
};

export default ProductDisplayCard;
