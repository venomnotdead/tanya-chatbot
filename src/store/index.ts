import { configureStore } from "@reduxjs/toolkit";
import storeReducer from "./reducers/storeReducer";
import productReducer from "./reducers/productReducer";

const store = configureStore({
  reducer: {
    store: storeReducer,
    product: productReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
