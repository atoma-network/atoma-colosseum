import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export default api;
