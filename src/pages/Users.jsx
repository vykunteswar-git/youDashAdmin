import { useState, useEffect } from "react";
import { userService } from "../services/apiService";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userService.getUsers();
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.phone.includes(search) ||
      user.email.toLowerCase().includes(search),
  );

  return (
    <div className="container mt-4">
      <h1 className="mb-2 text-primary fw-bold">
        <i className="bi bi-people me-2"></i>Customer Accounts
      </h1>
      <p className="text-muted mb-4">
        Manage registered users, track contact details, and review customer
        profiles.
      </p>
      <div className="mb-4">
        <input
          type="text"
          className="form-control form-control-lg"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            borderRadius: "10px",
            border: "2px solid #e9ecef",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#007bff")}
          onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
        />
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-striped shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.phone}</td>
                <td>{user.email}</td>
                <td>
                  <button
                    className="btn btn-outline-primary btn-sm"
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
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
