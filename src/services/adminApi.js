import {
  appConfigService,
  authService,
  commissionService,
  couponAdminService,
  hubRouteService,
  hubRouteSlaService,
  hubService,
  notificationAdminService,
  orderService,
  packageCategoryService,
  riderService,
  userService,
  vehicleService,
  walletAdminService,
  zoneService,
} from "./apiService";

/**
 * @typedef {Object} WithdrawalRequestRow
 * @property {number} withdrawalId
 * @property {number|string} riderId
 * @property {string=} riderName
 * @property {string=} riderPhone
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
  notifications: notificationAdminService,
  commission: commissionService,
  wallet: walletAdminService,
  coupons: couponAdminService,
};

export default adminApi;
