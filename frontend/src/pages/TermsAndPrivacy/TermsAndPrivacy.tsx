import React from "react";
import "./terms-and-privacy.css";

const TermsAndPrivacy: React.FC = () => {
  return (
    <div className="terms-privacy-wrapper" aria-label="Terms and Privacy Page">
      <div className="terms-privacy">
        <h1>
          Terms &amp; Conditions <br /> Privacy Policy
        </h1>

        <section aria-labelledby="general-info">
          <h2 id="general-info">General Information</h2>

          <div className="question">
            <strong>Q:</strong> What is the purpose of this document?
          </div>
          <div className="answer">
            <strong>A:</strong> This document outlines the Terms &amp; Conditions
            and Privacy Policy for using our application. It explains your rights
            and responsibilities when using the app and how we handle your
            information.
          </div>
        </section>

        <section aria-labelledby="terms">
          <h2 id="terms">Terms &amp; Conditions</h2>

          <div className="question">
            <strong>Q:</strong> Who may use the application?
          </div>
          <div className="answer">
            <strong>A:</strong> Anyone who agrees to these Terms &amp; Conditions
            is welcome to use the app. By accessing or using the app, you confirm
            that you have read, understood, and agree to be bound by these terms.
          </div>

          <div className="question">
            <strong>Q:</strong> What are my responsibilities when using the app?
          </div>
          <div className="answer">
            <strong>A:</strong> You agree to use the app in a lawful manner and
            not engage in any activities that may harm the service, other users,
            or violate any applicable laws.
          </div>

          <div className="question">
            <strong>Q:</strong> Are there any limitations on liability?
          </div>
          <div className="answer">
            <strong>A:</strong> Yes. While we strive to provide a secure and
            reliable service, the app is provided &quot;as is&quot; without
            warranties of any kind.
          </div>

          <div className="question">
            <strong>Q:</strong> How can I contact support?
          </div>
          <div className="answer">
            <strong>A:</strong> If you have any issues or questions, please reach
            out to our support team via the contact information provided in the app.
          </div>
        </section>

        <section aria-labelledby="privacy">
          <h2 id="privacy">Privacy Policy</h2>

          <div className="question">
            <strong>Q:</strong> What personal data do you collect?
          </div>
          <div className="answer">
            <strong>A:</strong> We use Amazon Cognito for user authentication.
            This means we do not store or manage passwords directly or any
            sensitive personal information.
          </div>

          <div className="question">
            <strong>Q:</strong> How is my data used?
          </div>
          <div className="answer">
            <strong>A:</strong> The primary use of your data is to verify your
            identity and provide access to our services.
          </div>

          <div className="question">
            <strong>Q:</strong> Is my data secure?
          </div>
          <div className="answer">
            <strong>A:</strong> Yes. By relying on Amazon Cognito, we ensure that
            industry-standard security practices are in place.
          </div>

          <div className="question">
            <strong>Q:</strong> Will my information ever be sold or misused?
          </div>
          <div className="answer">
            <strong>A:</strong> No. We are committed to protecting your privacy
            and will never sell your personal information.
          </div>

          <div className="question">
            <strong>Q:</strong> Can I request deletion of my data?
          </div>
          <div className="answer">
            <strong>A:</strong> Yes. If you wish to delete your account or
            request data removal, please contact our support team.
          </div>

          <div className="question">
            <strong>Q:</strong> How do cookies and similar technologies affect my data?
          </div>
          <div className="answer">
            <strong>A:</strong> We use a cookie to keep you logged in for up to
            seven days. This cookie stores session information and helps improve
            your experience.
          </div>
        </section>

        <section aria-labelledby="disclaimer">
          <h2 id="disclaimer">Disclaimer</h2>

          <div className="question">
            <strong>Q:</strong> What happens if these terms change?
          </div>
          <div className="answer">
            <strong>A:</strong> We reserve the right to modify or update these
            Terms &amp; Conditions and Privacy Policy at any time.
          </div>

          <div className="question">
            <strong>Q:</strong> Do these terms affect my legal rights?
          </div>
          <div className="answer">
            <strong>A:</strong> While we have taken care to make these policies
            clear, nothing in this document shall be interpreted as limiting your
            statutory rights under applicable law.
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsAndPrivacy;
