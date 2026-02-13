import { configureStore } from "@reduxjs/toolkit";
import storeReducer from "./reducers/storeReducer";
import productReducer from "./reducers/productReducer";
import customerReducer from "./reducers/customerReducer";

const store = configureStore({
  reducer: {
    store: storeReducer,
    product: productReducer,
    customer: customerReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
