import axios from "axios";
const baseURL:string= process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 35000,
});

export default api;
