// src/components/CallLogsList.jsx
import axios from "axios";
import React, { useEffect, useState } from "react";

const resolveUrl = (apiUrl, value) => {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `${apiUrl}/${value}`;
};

const formatWhen = (value) => {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  return `${day}, ${time}`;
};

const formatDuration = (seconds) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const STATUS_LABEL = {
  ringing: "Ringing",
  answered: "Answered",
  missed: "No answer",
  rejected: "Declined",
  cancelled: "Missed",
};

const CallLogsList = ({ apiUrl, currentUserId, onOpenChat, onStartCall }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCalls = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${apiUrl}/callLog/myCalls`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setCalls(response.data.calls || []);
      } catch (err) {
        console.error("Unable to load call logs:", err);
        if (!cancelled) setError("Couldn't load call history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCalls();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-gray-400 text-sm">
        Loading call history...
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-400 text-sm">{error}</div>;
  }

  if (!calls.length) {
    return (
      <div className="flex flex-col items-center py-10 text-gray-500">
        <i className="fa fa-phone text-3xl mb-3"></i>
        <p className="text-sm">No calls yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calls.map((call) => {
        const isOutgoing = call.caller?._id === currentUserId;
        const otherUser = isOutgoing ? call.receiver : call.caller;
        if (!otherUser) return null;

        const missed = ["missed", "rejected", "cancelled"].includes(call.status);
        const duration = formatDuration(call.duration);

        return (
          <div
            key={call._id}
            onClick={() => onOpenChat?.(otherUser)}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 cursor-pointer transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  resolveUrl(apiUrl, otherUser.profilePic) ||
                  "https://ui-avatars.com/api/?background=1f2937&color=fff&name=" +
                    encodeURIComponent(otherUser.name || "U")
                }
                alt={otherUser.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="text-gray-200 text-sm font-medium truncate">
                  {otherUser.name || "Unknown user"}
                </p>
                <div
                  className={`flex items-center gap-1 text-xs ${
                    missed ? "text-red-400" : "text-gray-400"
                  }`}
                >
                  <i
                    className={`fa fa-arrow-${isOutgoing ? "up" : "down"} ${
                      isOutgoing ? "-rotate-45" : "rotate-45"
                    }`}
                  ></i>
                  <i className={`fa fa-${call.type === "video" ? "video" : "phone"}`}></i>
                  <span>{STATUS_LABEL[call.status] || call.status}</span>
                  {duration && <span>· {duration}</span>}
                  <span className="ml-1 text-gray-500">
                    {formatWhen(call.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 pl-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartCall?.(otherUser, "audio");
                }}
                title="Voice call"
                className="text-green-400 hover:text-green-300"
              >
                <i className="fa fa-phone"></i>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartCall?.(otherUser, "video");
                }}
                title="Video call"
                className="text-green-400 hover:text-green-300"
              >
                <i className="fa fa-video"></i>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CallLogsList;