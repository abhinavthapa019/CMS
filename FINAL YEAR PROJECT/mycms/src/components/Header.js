import React from "react";

const Header = () => {
  return (
    <div className="bg-white flex justify-between items-center p-4 shadow">
      <h1 className="text-xl font-semibold">Welcome, Admin</h1>
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="border rounded px-2 py-1"
        />
        <button className="text-gray-600 hover:text-gray-900">🔔</button>
        <div className="rounded-full bg-gray-300 w-8 h-8">abhi</div>
      </div>
    </div>
  );
};

export default Header;