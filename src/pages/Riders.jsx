import { useState, useEffect } from "react";
import { riderService } from "../services/apiService";

const Riders = () => {
  const [riders, setRiders] = useState([]);
  const [newRider, setNewRider] = useState({
    name: "",
    phone: "",
    vehicle: "",
  });

  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const response = await riderService.getRiders();
        setRiders(response.data);
      } catch (error) {
        console.error("Error fetching riders:", error);
      }
    };

    fetchRiders();
  }, []);

  const handleToggleAvailability = async (id, currentAvailability) => {
    try {
      await riderService.toggleAvailability(id, !currentAvailability);
      // Refresh
      const response = await riderService.getRiders();
      setRiders(response.data);
    } catch (error) {
      alert("Failed to toggle availability");
    }
  };

  const handleAddRider = async (e) => {
    e.preventDefault();
    try {
      await riderService.addRider(newRider);
      setNewRider({ name: "", phone: "", vehicle: "" });
      // Refresh
      const response = await riderService.getRiders();
      setRiders(response.data);
    } catch (error) {
      alert("Failed to add rider");
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-2 text-primary fw-bold">
        <i className="bi bi-bicycle me-2"></i>Rider Network
      </h1>
      <p className="text-muted mb-4">
        Track delivery staff availability, add new riders, and manage fleet
        assignments.
      </p>
      <button
        className="btn btn-primary mb-4 shadow-sm"
        data-bs-toggle="modal"
        data-bs-target="#addRiderModal"
        style={{
          borderRadius: "10px",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
      >
        <i className="bi bi-plus-circle me-2"></i>Add New Rider
      </button>
      <div className="table-responsive">
        <table className="table table-hover table-striped shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => (
              <tr key={rider.id}>
                <td>{rider.name}</td>
                <td>{rider.phone}</td>
                <td>{rider.vehicle}</td>
                <td>
                  <span
                    className={`badge ${
                      rider.available ? "bg-success" : "bg-danger"
                    }`}
                  >
                    {rider.available ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td>
                  <button
                    className={`btn btn-sm ${
                      rider.available ? "btn-warning" : "btn-success"
                    }`}
                    onClick={() =>
                      handleToggleAvailability(rider.id, rider.available)
                    }
                    style={{
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.transform = "scale(1.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.transform = "scale(1)")
                    }
                  >
                    {rider.available ? "Set Unavailable" : "Set Available"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Rider Modal */}
      <div className="modal fade" id="addRiderModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add New Rider</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddRider}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newRider.name}
                    onChange={(e) =>
                      setNewRider({ ...newRider, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newRider.phone}
                    onChange={(e) =>
                      setNewRider({ ...newRider, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Vehicle</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newRider.vehicle}
                    onChange={(e) =>
                      setNewRider({ ...newRider, vehicle: e.target.value })
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  data-bs-dismiss="modal"
                >
                  Add Rider
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Riders;
