// Container meant to be used for anything requiring a card
import Icon from "./Icon";

export default function StatCard({ iconKey, variant, value, label, linkText, disabled, onClick }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon-bg bg-${variant}`}>
          <Icon name={iconKey} className={`card-icon text-${variant}`} />
        </div>
        <div className="stat-card-info">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
      <button
        type="button"
        className={`view-all-link-btn${disabled ? " disabled" : ""}`}
        disabled={disabled}
        onClick={onClick}
      >
        {linkText}
      </button>
    </div>
  );
}