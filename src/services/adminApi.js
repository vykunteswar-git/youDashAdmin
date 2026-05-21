import {
  analyticsService,
  appConfigService,
  authService,
  bannerAdminService,
  commissionService,
  couponAdminService,
  hubRouteService,
  hubRouteSlaService,
  hubService,
  incentiveAdminService,
  notificationAdminService,
  orderService,
  packageCategoryService,
  riderService,
  transactionAdminService,
  userService,
  vehicleService,
  walletAdminService,
  zoneService,
} from "./apiService";

/**
 * @typedef {Object} WithdrawalRequestRow
 * @property {number} id
 * @property {number|string} riderId
 * @property {number} amount
 * @property {"PENDING"|"APPROVED"|"REJECTED"|string} status
 * @property {string=} accountHolderName
 * @property {string=} accountNumber
 * @property {string=} ifsc
 * @property {string=} createdAt
 */

/**
 * Grouped admin APIs for easier imports in screens.
 * Keeps a single Axios instance from `apiService.js`.
 */
export const adminApi = {
  auth: authService,
  users: userService,
  vehicles: vehicleService,
  config: appConfigService,
  zones: zoneService,
  hubs: hubService,
  hubRoutes: hubRouteService,
  hubRouteSla: hubRouteSlaService,
  packageCategories: packageCategoryService,
  orders: orderService,
  riders: riderService,
  incentives: incentiveAdminService,
  notifications: notificationAdminService,
  commission: commissionService,
  wallet: walletAdminService,
  transactions: transactionAdminService,
  banners: bannerAdminService,
  coupons: couponAdminService,
  analytics: analyticsService,
};

export default adminApi;
