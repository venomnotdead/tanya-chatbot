import "./App.css";
import TanyaShoppingAssistantStream from "./components/tanya-widget/tanya-shopping-assistent";

function App() {
  return <TanyaShoppingAssistantStream />;
}

export default App;

// import { useEffect, useState } from "react";
// import "./App.css";
// import AgenticShopping from "./components/agenticShopping/agenticShopping";
// import TanyaShoppingAssistantStream from "./components/tanya-widget/tanya-shopping-assistent";

// function App() {
//   // return <TanyaShoppingAssistantStream />;
//   const [product, setProduct] = useState();
//   const [variationAttributes, setVariationAttributes] = useState();
//   const [addresses, setAddresses] = useState();

//   useEffect(() => {
//     setProduct(JSON.parse(localStorage.getItem("product")));
//     setVariationAttributes(
//       JSON.parse(localStorage.getItem("variationAttributes"))
//     );
//     setAddresses(
//       JSON.parse(localStorage.getItem("addresses"))
//     );
//   }, []);
//   console.log(product, variationAttributes);
//   return (
//     <>
//       {product && variationAttributes ? (
//         <AgenticShopping
//           open={true}
//           onClose={function (): void {
//             throw new Error("Function not implemented.");
//           }}
//           product={product}
//           variationAttributes={variationAttributes}
//           addresses={addresses}
//         />
//       ) : null}
//     </>
//   );
// }

// export default App;
