import logo from "../assets/logo.png";

const Navbar = () => {
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark shadow-sm"
      style={{
        background: "linear-gradient(90deg, #0f172a 0%, #1d4ed8 100%)",
      }}
    >
      <div className="container-fluid">
        <span className="navbar-brand fw-bold d-flex align-items-center">
          <img
            src={logo}
            alt="YouDash Express Logo"
            style={{
              height: "32px",
              width: "32px",
              objectFit: "contain",
              objectPosition: "left center",
              marginRight: "10px",
            }}
          />
          YouDash Express Admin
        </span>
        <div className="d-flex align-items-center">
          <span className="navbar-text me-3 text-light">Welcome, Admin</span>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
            style={{
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(255,255,255,0.15)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
          >
            <i className="bi bi-box-arrow-right me-1"></i>Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
