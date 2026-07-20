import { useAuth } from '../../context/useAuth';


const MentorDashboard = () => {
  const { logout } = useAuth();
  return (
    <div>
      <h1>Mentor Dashboard</h1>
      <button onClick={logout}>Log out</button>
    </div>
  );
};

export default MentorDashboard;