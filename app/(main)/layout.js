import React from "react"; // Import React explicitly (optional in React 17+)
import PropTypes from "prop-types"; // Import PropTypes

const MainLayout = ({ children }) => {
  return <div className="container mx-auto my-32">{children}</div>;
};

// Add PropTypes validation
MainLayout.propTypes = {
  children: PropTypes.node.isRequired, // Validate children
};

export default MainLayout;
