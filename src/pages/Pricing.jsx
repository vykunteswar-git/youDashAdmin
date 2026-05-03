/* Route commented out in src/routes/AppRoutes.jsx — uncomment if you keep a dedicated /pricing redirect. */

import { Navigate } from "react-router-dom";

/* TODO(Backend): No separate /admin/pricing on deployed OpenAPI; app rates live under GET/PUT /admin/config (Delivery fee screen). */

/** Legacy route: pricing fields are edited on Delivery fee. */
const Pricing = () => <Navigate to="/delivery-fee" replace />;

export default Pricing;
