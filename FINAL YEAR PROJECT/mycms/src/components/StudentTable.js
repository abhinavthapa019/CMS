import React from "react";

const students = [
  { id: 1021, name: "Sita ghimire", department: "Computer Science" },
  { id: 1045, name: "Anna Sharma", department: "Mathematics" },
  { id: 1087, name: "Priya Nepal", department: "Physics" },
];

const StudentTable = () => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-semibold mb-2">Student List</h2>
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Department</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-2">{s.id}</td>
              <td className="p-2">{s.name}</td>
              <td className="p-2">{s.department}</td>
              <td className="p-2 flex gap-2">
                <button className="text-blue-500 hover:underline">Edit</button>
                <button className="text-red-500 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;