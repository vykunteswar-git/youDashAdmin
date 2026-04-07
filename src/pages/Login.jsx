import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/apiService";
import logo from "../assets/logo.png";

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authService.login(credentials);
      localStorage.setItem("token", response.data.token);
      navigate("/dashboard");
    } catch (error) {
      alert("Login failed");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        background: "linear-gradient(135deg, #071b3f 0%, #0f4c81 100%)",
      }}
    >
      <div
        className="card p-5 shadow-lg border-0"
        style={{
          width: "450px",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          animation: "fadeIn 0.9s ease-in-out",
          borderRadius: "24px",
        }}
      >
        <div className="text-center mb-4">
          <img
            src={logo}
            alt="YouDash Express Logo"
            style={{
              height: "64px",
              width: "64px",
              objectFit: "contain",
              objectPosition: "left center",
              marginBottom: "20px",
            }}
          />
          <h2 className="fw-bold text-dark mt-4">Welcome to YouDash Express</h2>
          <p className="text-muted">
            Secure admin access for parcel delivery operations.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label fw-semibold">Username</label>
            <input
              type="text"
              className="form-control form-control-lg"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
              style={{
                borderRadius: "10px",
                border: "2px solid #e9ecef",
                transition: "border-color 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#007bff")}
              onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control form-control-lg"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              style={{
                borderRadius: "10px",
                border: "2px solid #e9ecef",
                transition: "border-color 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#007bff")}
              onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-100 btn-lg fw-bold"
            style={{
              borderRadius: "10px",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            <i className="bi bi-box-arrow-in-right me-2"></i>Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
