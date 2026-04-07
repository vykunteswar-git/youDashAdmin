import { useState, useEffect } from "react";
import {
  userService,
  orderService,
  riderService,
  paymentService,
} from "../services/apiService";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    activeOrders: 0,
    availableRiders: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, orders, riders, payments] = await Promise.all([
          userService.getUsers(),
          orderService.getOrders(),
          riderService.getRiders(),
          paymentService.getPayments(),
        ]);

        const activeOrders = orders.data.filter(
          (order) => order.status === "active",
        ).length;
        const availableRiders = riders.data.filter(
          (rider) => rider.available,
        ).length;
        const totalRevenue = payments.data.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );

        setStats({
          totalUsers: users.data.length,
          totalOrders: orders.data.length,
          activeOrders,
          availableRiders,
          totalRevenue,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="mb-2 text-primary fw-bold">YouDash Express Dashboard</h1>
      <p className="text-muted mb-4">
        Real-time parcel delivery insights for users, orders, riders, and
        payments.
      </p>
      <div className="row">
        <div className="col-md-3 mb-4">
          <div
            className="card text-center shadow-sm border-0"
            style={{
              background: "rgba(255,255,255,0.98)",
              borderLeft: "6px solid #2563eb",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.08)";
            }}
          >
            <div className="card-body">
              <i
                className="bi bi-people-fill display-4 mb-2"
                style={{ color: "#2563eb" }}
              />
              <h5 className="card-title text-secondary">Total Users</h5>
              <p className="card-text display-4 fw-bold text-dark">
                {stats.totalUsers}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div
            className="card text-center shadow-sm border-0"
            style={{
              background: "rgba(255,255,255,0.98)",
              borderLeft: "6px solid #0ea5e9",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.08)";
            }}
          >
            <div className="card-body">
              <i
                className="bi bi-box-seam-fill display-4 mb-2"
                style={{ color: "#0284c7" }}
              />
              <h5 className="card-title text-secondary">Total Orders</h5>
              <p className="card-text display-4 fw-bold text-dark">
                {stats.totalOrders}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div
            className="card text-center shadow-sm border-0"
            style={{
              background: "rgba(255,255,255,0.98)",
              borderLeft: "6px solid #14b8a6",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.08)";
            }}
          >
            <div className="card-body">
              <i
                className="bi bi-clock-fill display-4 mb-2"
                style={{ color: "#0ea5e9" }}
              />
              <h5 className="card-title text-secondary">Active Orders</h5>
              <p className="card-text display-4 fw-bold text-dark">
                {stats.activeOrders}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div
            className="card text-center shadow-sm border-0"
            style={{
              background: "rgba(255,255,255,0.98)",
              borderLeft: "6px solid #22c55e",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.08)";
            }}
          >
            <div className="card-body">
              <i
                className="bi bi-bicycle display-4 mb-2"
                style={{ color: "#14b8a6" }}
              />
              <h5 className="card-title text-secondary">Available Riders</h5>
              <p className="card-text display-4 fw-bold text-dark">
                {stats.availableRiders}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div
            className="card text-center shadow-sm border-0"
            style={{
              background: "rgba(255,255,255,0.98)",
              borderLeft: "6px solid #f97316",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.08)";
            }}
          >
            <div className="card-body">
              <i
                className="bi bi-cash-stack display-4 mb-2"
                style={{ color: "#f97316" }}
              />
              <h5 className="card-title text-secondary">Total Revenue</h5>
              <p className="card-text display-4 fw-bold text-dark">
                ₹{stats.totalRevenue}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
