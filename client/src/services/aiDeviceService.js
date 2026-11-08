import api from "./api.js";

export const generateDeviceDescription = async (device) => {
  const response = await api.post("/ai/generate-device-description", device);

  if (!response?.description || typeof response.description !== "string") {
    throw new Error(
      response?.message || "AI chưa trả về mô tả thiết bị hợp lệ.",
    );
  }

  return response.description;
};
