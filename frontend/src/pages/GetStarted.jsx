import { Link } from "react-router-dom";

import Layout from "../components/Layout";

function GetStarted() {
  return (
    <Layout centered>
      <div className="form-shell auth-page">
        <div className="page-heading">
          <p className="eyebrow">OfferTrail workspace</p>
          <h1 className="page-title">Get started with OfferTrail</h1>
          <p className="page-subtitle">
            Create a student account to track applications and receive opportunities,
            or sign in to continue where you left off.
          </p>
        </div>

        <div className="surface gateway-card">
          <Link to="/register" className="primary-button">Create an account</Link>
          <Link to="/login" className="secondary-button">Sign in</Link>
        </div>
      </div>
    </Layout>
  );
}

export default GetStarted;
