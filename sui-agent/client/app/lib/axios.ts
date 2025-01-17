import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api/",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 35000,
});

export default api;
