import { useState, useEffect } from "react";
import { orderService, riderService } from "../services/apiService";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, ridersRes] = await Promise.all([
          orderService.getOrders(),
          riderService.getRiders(),
        ]);
        setOrders(ordersRes.data);
        setRiders(ridersRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleAssignRider = async (orderId, riderId) => {
    try {
      await orderService.assignRider(orderId, riderId);
      // Refresh orders
      const response = await orderService.getOrders();
      setOrders(response.data);
    } catch (error) {
      alert("Failed to assign rider");
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await orderService.updateStatus(orderId, status);
      // Refresh orders
      const response = await orderService.getOrders();
      setOrders(response.data);
    } catch (error) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-2 text-primary fw-bold">
        <i className="bi bi-box-seam me-2"></i>Order Management
      </h1>
      <p className="text-muted mb-4">
        View shipment routes, update delivery status, and assign riders to
        parcels.
      </p>
      <div className="table-responsive">
        <table className="table table-hover table-striped shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>Order ID</th>
              <th>Pickup → Delivery</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>
                  {order.pickup} → {order.delivery}
                </td>
                <td>
                  <span
                    className={`badge ${
                      order.status === "delivered"
                        ? "bg-success"
                        : order.status === "in-transit"
                          ? "bg-warning"
                          : "bg-secondary"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      order.paymentStatus === "paid"
                        ? "bg-success"
                        : "bg-danger"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </td>
                <td>
                  <select
                    className="form-select form-select-sm d-inline-block w-auto me-2"
                    onChange={(e) =>
                      handleAssignRider(order.id, e.target.value)
                    }
                    defaultValue=""
                    style={{
                      borderRadius: "5px",
                      transition: "border-color 0.3s ease",
                    }}
                  >
                    <option value="" disabled>
                      Assign Rider
                    </option>
                    {riders
                      .filter((r) => r.available)
                      .map((rider) => (
                        <option key={rider.id} value={rider.id}>
                          {rider.name}
                        </option>
                      ))}
                  </select>
                  <select
                    className="form-select form-select-sm d-inline-block w-auto"
                    onChange={(e) =>
                      handleUpdateStatus(order.id, e.target.value)
                    }
                    defaultValue=""
                    style={{
                      borderRadius: "5px",
                      transition: "border-color 0.3s ease",
                    }}
                  >
                    <option value="" disabled>
                      Update Status
                    </option>
                    <option value="pending">Pending</option>
                    <option value="in-transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
