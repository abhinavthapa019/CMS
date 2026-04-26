import React from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardCards from "./components/DashboardCards";
import StudentTable from "./components/StudentTable";
import TeacherTable from "./components/TeacherTable";

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Dashboard Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCards />
        </div>

        {/* Quick Actions */}
        <div className="p-6 flex gap-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            + Add New Student
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            + Add New Teacher
          </button>
          <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
            Post Notice
          </button>
        </div>

        {/* Tables */}
        <div className="p-6 space-y-6">
          <StudentTable />
          <TeacherTable />
        </div>
      </div>
    </div>
  );
}

export default App;