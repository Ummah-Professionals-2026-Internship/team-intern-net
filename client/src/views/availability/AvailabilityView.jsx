import { useEffect, useState } from "react";
import api from "../../api/api";
import "./AvailabilityView.css";

export default function AvailabilityView({ mentorId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await api.get(`/mentors/${mentorId}/availability`);
        setSlots(response.data);
      } catch (err) {
        setError("Could not load available times. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, [mentorId]);

  const formatDateTime = (dt) => {
    const date = new Date(dt);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  const handleBooking = async () => {
  if (!studentId) {
    alert("Please enter your Student ID.");
    return;
  }

  try {
    const response = await api.post(
      `/meetings?student_id=${studentId}`,
      {
        slot_id: selected.id,
      }
    );

    console.log(response.data);
    alert("Meeting booked successfully!");

    // Remove the booked slot from the page
    setSlots(slots.filter((slot) => slot.id !== selected.id));
    setSelected(null);
  } catch (err) {
    console.error(err);
    alert("Booking failed.");
  }
};
  if (loading) return <div className="av-state">Loading available times...</div>;
  if (error) return <div className="av-state av-error">{error}</div>;
  if (slots.length === 0) return <div className="av-state">No available times found for this mentor.</div>;

  return (
    <div className="av-container">
      <h2 className="av-title">Available Meeting Times</h2>
      <p className="av-subtitle">Select a time that works for you</p>
      <div className="av-grid">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`av-slot ${selected?.id === slot.id ? "av-slot--selected" : ""}`}
            onClick={() => setSelected(slot)}
          >
            <div className="av-slot-date">{formatDateTime(slot.start_datetime)}</div>
            <div className="av-slot-duration">
              to {formatDateTime(slot.end_datetime)}
            </div>
          </div>
        ))}
      </div>
{selected && (
  <div className="av-confirm">

    <input
      type="number"
      className="av-input"
      placeholder="Enter your Student ID"
      value={studentId}
      onChange={(e) => setStudentId(e.target.value)}
    />

    <p>
      Selected: <strong>{formatDateTime(selected.start_datetime)}</strong>
    </p>

    <button
      className="av-btn"
      onClick={handleBooking}
    >
      Confirm Selection
    </button>

  </div>
)}
    </div>
  );
}