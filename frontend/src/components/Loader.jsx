import React from "react";

const Loader = ({ text = "Loading..." }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col items-center shadow-2xl">
        {/* Spinner */}
        <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>

        {/* Text */}
        <p className="text-white mt-5 text-lg font-medium">{text}</p>
      </div>
    </div>
  );
};

export default Loader;
