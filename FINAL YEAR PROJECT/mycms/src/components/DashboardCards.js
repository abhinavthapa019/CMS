import React from "react";

const cards = [
  { title: "Total Students", value: 120, color: "bg-blue-200" },
  { title: "Total Teachers", value: 10, color: "bg-teal-300" },
  { title: "At-Risk Students", value: 5, color: "bg-red-400" },
  { title: "Total Assignments", value: 15, color: "bg-orange-200" },
];

const DashboardCards = () => {
  return (
    <>
      {cards.map((card) => (
        <div
          key={card.title}
          className={`${card.color} p-4 rounded shadow flex flex-col items-center`}
        >
          <div className="font-semibold">{card.title}</div>
          <div className="text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </>
  );
};

export default DashboardCards;