import axios from "axios";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/orders`;

export const getOrders = async () => {
  const response = await axios.get(API_BASE_URL, {
    withCredentials: true,
  });
  return response.data;
};
