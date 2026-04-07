import { Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Users from "../pages/Users";
import Orders from "../pages/Orders";
import Riders from "../pages/Riders";
import Payments from "../pages/Payments";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const AppRoutes = () => {
  const isLoggedIn = localStorage.getItem("token");

  // if (!isLoggedIn) {
  //   return (
  //     <Routes>
  //       <Route path="*" element={<Login />} />
  //     </Routes>
  //   );
  // }

  return (
    <div
      className="d-flex position-relative"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1920&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        color: "#111827",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.35)",
          pointerEvents: "none",
        }}
      />
      <Sidebar />
      <div
        className="flex-grow-1 position-relative"
        style={{
          backgroundColor: "rgba(248,249,250,0.95)",
          backdropFilter: "blur(8px)",
          minHeight: "100vh",
        }}
      >
        <Navbar />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/riders" element={<Riders />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
};

export default AppRoutes;
