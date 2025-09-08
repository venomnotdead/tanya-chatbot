import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SearchProduct } from "../../components/graphQL/queries/types";

interface ProductState {
  product: SearchProduct | null;
}

const initialState: ProductState = {
  product: null,
};

export const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    setProduct: (state, action: PayloadAction<SearchProduct | null>) => {
      state.product = action.payload;
    },
  },
});

export const { setProduct } = productSlice.actions;

export default productSlice.reducer;
