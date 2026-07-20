import { useAuth } from '../../context/useAuth';


const AdminDashboard = () => {
  const { logout } = useAuth();
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <button onClick={logout}>Log out</button>
    </div>
  );
};

export default AdminDashboard;