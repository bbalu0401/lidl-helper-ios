import React, { useEffect, useState } from 'react';
import { getDailyInfo } from './api/entities';

export default function App() {
  const [info, setInfo] = useState([]);
  useEffect(() => {
    getDailyInfo().then(setInfo).catch(console.error);
  }, []);

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">Lidl Helper 🖤</h1>
      <p className="opacity-75 mb-4">Dark Mode · Supabase connected</p>
      <ul className="space-y-2">
        {info.map((item) => (
          <li key={item.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <strong>{item.title}</strong>
            <p>{item.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
