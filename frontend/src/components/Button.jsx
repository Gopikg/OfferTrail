function Button({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="primary-button"
    >
      {children}
    </button>
  );
}

export default Button;
