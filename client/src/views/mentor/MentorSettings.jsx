import "./MentorSettings.css";
import api from "../../api/api";

import { useState } from "react";
import "./MentorSettings.css";


const MentorSettings = () => {

    const [formData, setFormData] = useState({
        current_password: "",
        new_password: "",
        confirm_new_password: "",
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState({
        current_password: false,
        new_password: false,
        confirm_new_password: false,
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword({
            ...showPassword,
            [field]: !showPassword[field],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (formData.new_password !== formData.confirm_new_password) {
            setError("New passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.patch(
                "/auth/change-password",
                formData
            );

            setMessage(response.data.message);

            setFormData({
                current_password: "",
                new_password: "",
                confirm_new_password: "",
            });

        } catch (err) {

            setError(
                err.response?.data?.detail ||
                "Failed to update password."
            );

        } finally {
            setLoading(false);
        }
    };


    return (
    <div className="ms-page">
        {/* Header */}
        <div className="ms-header">
            <h2 className="ms-title">Settings</h2>
        </div>

        <div className="ms-container">
            <div className="ms-card">
                
                <div className="ms-section">
                    <h3>Change Password</h3>

                    <form onSubmit={handleSubmit}>
                        <div className="ms-field">
                            <label>
                                Current Password
                            </label>
                            <div className="ms-password-wrapper">

                                <input
                                    type={
                                        showPassword.current_password
                                            ? "text"
                                            : "password"
                                    }
                                    name="current_password"
                                    value={formData.current_password}
                                    onChange={handleChange}
                                />

                                <button
                                    type="button"
                                    className="ms-show-password"
                                    onClick={() =>
                                        togglePasswordVisibility("current_password")
                                    }
                                >
                                    {showPassword.current_password ? "Hide" : "Show"}
                                </button>

                            </div>
                        </div>

                        <div className="ms-field">
                            <label>
                                New Password
                            </label>
                            <div className="ms-password-wrapper">

                                <input
                                    type={
                                        showPassword.new_password
                                            ? "text"
                                            : "password"
                                    }
                                    name="new_password"
                                    value={formData.new_password}
                                    onChange={handleChange}
                                />

                                <button
                                    type="button"
                                    className="ms-show-password"
                                    onClick={() =>
                                        togglePasswordVisibility("new_password")
                                    }
                                >
                                    {showPassword.new_password ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="ms-field">
                            <label>
                                Confirm New Password
                            </label>

                            <div className="ms-password-wrapper">
                                <input
                                    type={
                                        showPassword.confirm_new_password
                                            ? "text"
                                            : "password"
                                    }
                                    name="confirm_new_password"
                                    value={formData.confirm_new_password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="ms-show-password"
                                    onClick={() =>
                                        togglePasswordVisibility("confirm_new_password")
                                    }
                                >
                                    {showPassword.confirm_new_password ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        {message && (
                            <p className="ms-success">
                                {message}
                            </p>
                        )}

                        {error && (
                            <p className="ms-error">
                                {error}
                            </p>
                        )}

                        <button
                            className="ms-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Updating..."
                                : "Update Password"
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    );
};


export default MentorSettings;

