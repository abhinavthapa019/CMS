import React from "react";
import {
  HomeIcon,
  UserGroupIcon,
  ClipboardIcon,
  BellIcon,
} from "@heroicons/react/outline";

const Sidebar = () => {
  return (
    <div className="w-64 bg-blue-700 text-white flex flex-col">
      <div className="text-2xl font-bold p-6">Admin Dashboard</div>
      <nav className="flex flex-col gap-2 px-4">
        <a href="#" className="flex items-center gap-2 p-2 hover:bg-blue-800 rounded">
          <HomeIcon className="h-5 w-5" /> Dashboard
        </a>
        <a href="#" className="flex items-center gap-2 p-2 hover:bg-blue-800 rounded">
          <UserGroupIcon className="h-5 w-5" /> Students
        </a>
        <a href="#" className="flex items-center gap-2 p-2 hover:bg-blue-800 rounded">
          <UserGroupIcon className="h-5 w-5" /> Teachers
        </a>
        <a href="#" className="flex items-center gap-2 p-2 hover:bg-blue-800 rounded">
          <ClipboardIcon className="h-5 w-5" /> Attendance
        </a>
        <a href="#" className="flex items-center gap-2 p-2 hover:bg-blue-800 rounded">
          <ClipboardIcon className="h-5 w-5" /> Assignments
        </a>
        <a href="#" className="flex items-center gap-2 p-2 hover:bg-blue-800 rounded">
          <BellIcon className="h-5 w-5" /> Notices
        </a>
      </nav>
    </div>
  );
};

export default Sidebar;