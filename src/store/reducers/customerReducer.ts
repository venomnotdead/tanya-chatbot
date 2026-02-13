/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface CustomerState {
  customerId?: string;
  addresses?: any[];
}

const initialState: CustomerState = {
  customerId: "",
  addresses: [],
};

export const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setCustomer: (state, action: PayloadAction<CustomerState | null>) => {
      state.customerId = action.payload?.customerId || "";
      state.addresses = action.payload?.addresses || [];
    },
  },
});

export const { setCustomer } = customerSlice.actions;

export default customerSlice.reducer;
