function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 text-center">

      <h3 className="text-gray-500">
        {title}
      </h3>

      <p className="text-3xl font-bold mt-3">
        {value}
      </p>

    </div>
  );
}

export default StatCard;