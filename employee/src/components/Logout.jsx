import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Clear any auth tokens or user data here
    localStorage.removeItem("token"); // or whatever you use for auth
    // Optionally clear more user data
    navigate("/"); // Redirect to login or home
  }, [navigate]);
  return <div>Logging out...</div>;
};

export default Logout;
