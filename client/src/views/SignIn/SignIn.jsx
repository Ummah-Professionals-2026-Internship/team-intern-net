import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';

// Importing svgs
import logoWhite from '../../assets/horizontal white 1.svg';
import swirlBg from '../../assets/horizontal-swirl.svg';

import './SignIn.css';

const SignIn = () => {
  // 1. Local UI states
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    console.log('Submitting credentials:', { email, password });
  };

  return (
    <div className="signin-page-wrapper">
      
      {/* LEFT COLUMN: BRANDING SIDEBAR */}
      <div className="signin-sidebar">

        <div className="sidebar-content">
          <img src={logoWhite} alt="Ummah Professionals Logo" className="sidebar-logo" />
          <h1 className="sidebar-tagline">
            connecting an <span className="text-gold">ummah</span> <br />
            of <span className="text-gold">professionals</span>
          </h1>
        </div>

        {/* Wave sits between content and description */}
        <img src={swirlBg} className="sidebar-bg-wave" alt="" />

        {/* Description is now BELOW the wave */}
        <p className="sidebar-description">
          Join a network of Muslim professionals helping one another begin and advance their careers
        </p>

      </div>

      {/* RIGHT COLUMN: SIGN IN FORM */}
      <div className="signin-form-section">
        <div className="signin-form-container">
          <header className="form-header">
            <h2>WELCOME!</h2>
            <p>sign into your account</p>
          </header>
          
          <form onSubmit={handleFormSubmit}>
            <InputField
              label="email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="password"
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              rightIcon={
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M20.4697 2.57718C20.7626 2.27155 21.2373 2.27156 21.5302 2.57718C21.8231 2.88281 21.8231 3.37823 21.5302 3.68384L3.53022 22.4664C3.23734 22.7721 2.76257 22.772 2.46967 22.4664C2.17678 22.1608 2.17678 21.6654 2.46967 21.3598L5.41401 18.2864C4.09517 17.0816 3.0813 15.5219 2.51264 13.7487L2.39252 13.3442C2.26216 12.8745 2.24499 12.3785 2.34272 11.9022L2.39252 11.6995C3.59965 7.35268 7.44226 4.17426 11.997 4.17399C13.9755 4.17399 15.8192 4.77467 17.371 5.80952L20.4697 2.57718ZM11.997 5.73921C8.12793 5.73947 4.85934 8.43878 3.83295 12.1346C3.76288 12.387 3.76286 12.6566 3.83295 12.909C4.30048 14.5925 5.23467 16.0678 6.47748 17.1767L8.69037 14.8666C8.25453 14.1983 7.99995 13.3911 7.99994 12.5218C7.99994 10.2166 9.7908 8.3479 11.9999 8.3479C12.833 8.34791 13.6066 8.61356 14.247 9.06835L16.2802 6.94777C15.0223 6.18004 13.5587 5.73921 11.997 5.73921ZM11.9999 9.91312C10.6192 9.91312 9.49994 11.0811 9.49994 12.5218C9.49995 12.9566 9.60282 13.3659 9.78315 13.7263L13.1542 10.2086C12.8088 10.0205 12.4166 9.91313 11.9999 9.91312Z" fill="#363538"/>
                    <path d="M19.6337 7.87508C20.5271 8.9776 21.2061 10.2755 21.6015 11.6995C21.7505 12.2364 21.7505 12.8073 21.6015 13.3442C20.3943 17.691 16.5519 20.8696 11.997 20.8696C10.5795 20.8696 9.23135 20.5596 8.00971 20.0045L9.16596 18.798C10.0517 19.1245 11.0044 19.3044 11.997 19.3044C15.8662 19.3044 19.1346 16.6049 20.1611 12.909C20.2312 12.6565 20.2312 12.3871 20.1611 12.1346C19.837 10.9676 19.2887 9.90048 18.5693 8.98581L19.6337 7.87508Z" fill="#363538"/>
                    <path d="M15.9287 11.7412C15.9745 11.9942 15.9999 12.255 15.9999 12.5218C15.9999 14.827 14.209 16.6957 11.9999 16.6957C11.7442 16.6957 11.4943 16.6692 11.2519 16.6213L12.8232 14.9817C13.5407 14.7203 14.1068 14.1295 14.3574 13.3808L15.9287 11.7412Z" fill="#363538"/>
                  </svg>
                </button>
              }
            />

            <div className="forgot-password-link">
              <a href="/forgot-password">Forgot Password?</a>
            </div>

            <div className="form-actions">
              <Button type="submit" className="signin-submit-btn">
                log in
              </Button>
            </div>
          </form>

          <footer className="form-footer-notice">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none">
              <path d="M11.1604 16.1387C11.1508 16.6214 11.5398 17.0177 12.0226 17.017C12.5053 17.0163 12.8931 16.6192 12.8823 16.1367L12.7626 10.7624C12.7536 10.3557 12.421 10.031 12.0143 10.0315C11.6077 10.0321 11.2762 10.3576 11.2681 10.764L11.1604 16.1387Z" fill="#007CA6"/>
              <path d="M12.7197 7.3252C12.5224 7.11937 12.2859 7.01665 12.0102 7.01705C11.8283 7.01731 11.6633 7.06425 11.5149 7.15786C11.3635 7.2547 11.2425 7.3837 11.1518 7.54486C11.0581 7.70603 11.0114 7.88484 11.0117 8.0813C11.0121 8.37115 11.1125 8.619 11.3128 8.82483C11.51 9.03066 11.7435 9.13338 12.0132 9.13299C12.289 9.13259 12.5252 9.02919 12.7219 8.82279C12.9155 8.61639 13.0121 8.36826 13.0117 8.07841C13.0113 7.78211 12.9139 7.53104 12.7197 7.3252Z" fill="#007CA6"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M2.01741 12.0315C2.00942 6.50868 6.48009 2.02505 12.0029 2.01706C17.5258 2.00906 22.0094 6.47973 22.0174 12.0026C22.0254 17.5254 17.5547 22.009 12.0319 22.017C6.50903 22.025 2.0254 17.5544 2.01741 12.0315ZM3.51741 12.0293C3.51061 7.33493 7.31068 3.52385 12.0051 3.51706C16.6995 3.51026 20.5106 7.31033 20.5174 12.0047C20.5242 16.6992 16.7241 20.5102 12.0297 20.517C7.33528 20.5238 3.5242 16.7238 3.51741 12.0293Z" fill="#007CA6"/>
            </svg>

            <span>accounts are created after submitting an application form</span>
          </footer>
        </div>
      </div>

    </div>
  );
};

export default SignIn;