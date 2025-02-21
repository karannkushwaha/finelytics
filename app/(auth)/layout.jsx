import React from "react"; // Import React (optional in React 17+)
import PropTypes from "prop-types"; // Import PropTypes

const AuthLayout = ({ children }) => {
  return <div className="flex justify-center pt-40">{children}</div>;
};

// Add PropTypes validation
AuthLayout.propTypes = {
  children: PropTypes.node.isRequired, // Validate children
};

export default AuthLayout;
