import { useNavigate } from "react-router-dom";
import "./landingPage.css"

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="lp-page">
            <div className="lp-container">
                    <div className="lp-card">
                        <div className="lp-card-title">
                            Career Prep Form
                        </div>
                        <div className="lp-card-subtitle">
                            Request personalized support for your career journey! Get help with resumes, mock interviews and general career advice
                        </div>
                        <div>
                            <button className="lp-btn" onClick={() => navigate("/prep") }> Career Prep Form</button>
                        </div>

                    </div>
                    <div className="lp-card">
                        <div className="lp-card-title">
                            Career Advisor Sign up
                        </div>
                        <div className="lp-card-subtitle">
                            Use your experience to make an impact! Sign up to become a volunteer advisor and support the next generation of professionals
                        </div>
                        <div>
                            <button className="lp-btn" onClick={() => navigate("/advisor")}> SignUp</button>
                        </div>

                    </div>
                    <div className="lp-card">
                        <div className="lp-card-title"> 
                            Login
                        </div>
                        <div className="lp-card-subtitle">
                            If you have an existing account, sign in below
                        </div>
                        <div> 
                            <button className="lp-btn" onClick={() => navigate("/signin")}> Sigin</button>
                        </div>

                    </div>

            </div>
        </div>
    );
};

export default LandingPage;