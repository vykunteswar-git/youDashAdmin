import { Navigate } from "react-router-dom";

/** Legacy route: pricing fields are edited on Delivery fee. */
const Pricing = () => <Navigate to="/delivery-fee" replace />;

export default Pricing;
