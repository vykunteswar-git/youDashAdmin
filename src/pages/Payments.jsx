import { useState, useEffect } from "react";
import { paymentService } from "../services/apiService";

const Payments = () => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await paymentService.getPayments();
        setPayments(response.data);
      } catch (error) {
        console.error("Error fetching payments:", error);
      }
    };

    fetchPayments();
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="mb-2 text-primary fw-bold">
        <i className="bi bi-credit-card me-2"></i>Payments Overview
      </h1>
      <p className="text-muted mb-4">
        Monitor collection status and ensure all order payments are tracked
        accurately.
      </p>
      <div className="table-responsive">
        <table className="table table-hover table-striped shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>Order ID</th>
              <th>Amount</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.orderId}</td>
                <td className="fw-bold text-success">₹{payment.amount}</td>
                <td>
                  <span
                    className={`badge ${
                      payment.status === "paid" ? "bg-success" : "bg-danger"
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;
