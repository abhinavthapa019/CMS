import React from "react";

const teachers = [
  { id: "T201", name: "Mr. Thapa", subject: "Mathematics" },
  { id: "T305", name: "Ms. Khadka", subject: "English" },
];

const TeacherTable = () => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-semibold mb-2">Teacher List</h2>
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Subject</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="p-2">{t.id}</td>
              <td className="p-2">{t.name}</td>
              <td className="p-2">{t.subject}</td>
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

export default TeacherTable;