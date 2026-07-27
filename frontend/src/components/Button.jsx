function Button({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg transition"
    >
      {children}
    </button>
  );
}

export default Button;