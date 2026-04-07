import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

const Sidebar = () => {
  return (
    <div
      className="text-white vh-100 p-3 shadow-lg"
      style={{
        width: "250px",
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
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
            marginBottom: "10px",
          }}
        />
        <h4 className="mb-0">YouDash Express</h4>
        <small className="text-white-50">Delivery Operations</small>
      </div>
      <ul className="nav flex-column">
        <li className="nav-item mb-2">
          <Link
            to="/dashboard"
            className="nav-link text-white py-3 px-3 rounded"
            style={{
              transition: "all 0.3s ease",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.1)")
            }
          >
            <i className="bi bi-house-door me-2"></i>Dashboard
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link
            to="/users"
            className="nav-link text-white py-3 px-3 rounded"
            style={{
              transition: "all 0.3s ease",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.1)")
            }
          >
            <i className="bi bi-people me-2"></i>Users
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link
            to="/orders"
            className="nav-link text-white py-3 px-3 rounded"
            style={{
              transition: "all 0.3s ease",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.1)")
            }
          >
            <i className="bi bi-box-seam me-2"></i>Orders
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link
            to="/riders"
            className="nav-link text-white py-3 px-3 rounded"
            style={{
              transition: "all 0.3s ease",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.1)")
            }
          >
            <i className="bi bi-bicycle me-2"></i>Riders
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link
            to="/payments"
            className="nav-link text-white py-3 px-3 rounded"
            style={{
              transition: "all 0.3s ease",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.1)")
            }
          >
            <i className="bi bi-credit-card me-2"></i>Payments
          </Link>
        </li>
        <li className="nav-item mt-4">
          <Link
            to="/login"
            className="nav-link text-white py-3 px-3 rounded"
            style={{
              transition: "all 0.3s ease",
              backgroundColor: "rgba(220,38,38,0.15)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(220,38,38,0.25)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(220,38,38,0.15)")
            }
          >
            <i className="bi bi-box-arrow-right me-2"></i>Logout
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
