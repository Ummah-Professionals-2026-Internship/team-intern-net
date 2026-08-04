import { useAuth } from '../../context/useAuth';


const StudentDashboard = () => {
  const { logout } = useAuth();
  return (
    <div>
      <h1>Student Dashboard</h1>
      <button onClick={logout}>Log out</button>
    </div>
  );
};
export default StudentDashboard;