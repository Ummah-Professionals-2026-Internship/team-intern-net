import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import api from '../../api/api';

// Assets
import logoWhite from '../../assets/horizontal white 1.svg';
import swirlBg from '../../assets/horizontal-swirl.svg';
import './SignIn.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(response.data.message || 'Password reset instructions have been sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.detail || 'An error occurred while requesting password reset. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page-wrapper">
      {/* LEFT COLUMN: BRANDING SIDEBAR */}
      <div className="signin-sidebar">
        <div className="sidebar-content">
          <img src={logoWhite} alt="Ummah Professionals Logo" className="sidebar-logo" />
          <h1 className="sidebar-tagline">
            Connecting an <span className="text-gold">Ummah</span> <br /> of <span className="text-gold">Professionals</span>
          </h1>
        </div>
        <img src={swirlBg} className="sidebar-bg-wave" alt="" />
        <p className="sidebar-description">
          Join a network of Muslim professionals helping one another begin and advance their careers
        </p>
      </div>

      {/* RIGHT COLUMN: FORGOT PASSWORD FORM */}
      <div className="signin-form-section">
        <div className="signin-form-container">
          <header className="form-header">
            <h2>FORGOT PASSWORD?</h2>
            <p>Enter your email to receive reset instructions</p>
          </header>

          {successMessage ? (
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{
                backgroundColor: '#e6f4ea',
                color: '#137333',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {successMessage}
              </div>
              <Link to="/signin" className="signin-submit-btn" style={{ textDecoration: 'none', margin: '0 auto', display: 'inline-flex' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <InputField
                label="Email Address"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter registered email"
              />

              {error && (
                <p className="form-error" role="alert" style={{ marginBottom: '16px' }}>
                  {error}
                </p>
              )}

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <Button type="submit" className="signin-submit-btn" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <div className="signup-redirect" style={{ marginTop: '12px' }}>
                  Remembered your password? <Link to="/signin" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>Sign In</Link>
                </div>
              </div>
            </form>
          )}

          <footer className="form-footer-notice">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none">
              <path d="M11.1604 16.1387C11.1508 16.6214 11.5398 17.0177 12.0226 17.017C12.5053 17.0163 12.8931 16.6192 12.8823 16.1367L12.7626 10.7624C12.7536 10.3557 12.421 10.031 12.0143 10.0315C11.6077 10.0321 11.2762 10.3576 11.2681 10.764L11.1604 16.1387Z" fill="#007CA6"/>
              <path d="M12.7197 7.3252C12.5224 7.11937 12.2859 7.01665 12.0102 7.01705C11.8283 7.01731 11.6633 7.06425 11.5149 7.15786C11.3635 7.2547 11.2425 7.3837 11.1518 7.54486C11.0581 7.70603 11.0114 7.88484 11.0117 8.0813C11.0121 8.37115 11.1125 8.619 11.3128 8.82483C11.51 9.03066 11.7435 9.13338 12.0132 9.13299C12.289 9.13259 12.5252 9.02919 12.7219 8.82279C12.9155 8.61639 13.0121 8.36826 13.0117 8.07841C13.0113 7.78211 12.9139 7.53104 12.7197 7.3252Z" fill="#007CA6"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M2.01741 12.0315C2.00942 6.50868 6.48009 2.02505 12.0029 2.01706C17.5258 2.00906 22.0094 6.47973 22.0174 12.0026C22.0254 17.5254 17.5547 22.009 12.0319 22.017C6.50903 22.025 2.0254 17.5544 2.01741 12.0315ZM3.51741 12.0293C3.51061 7.33493 7.31068 3.52385 12.0051 3.51706C16.6995 3.51026 20.5106 7.31033 20.5174 12.0047C20.5242 16.6992 16.7241 20.5102 12.0297 20.517C7.33528 20.5238 3.5242 16.7238 3.51741 12.0293Z" fill="#007CA6"/>
            </svg>
            <span>Instructions will be sent if your account is eligible</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
