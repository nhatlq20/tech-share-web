import Device from "../models/Device.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
export const aiCompare = async (req, res) => {
  try {
    const { deviceId1, deviceId2 } = req.body;

    if (!deviceId1 || !deviceId2) {
      return res.status(400).json({
        message: "Please provide both device IDs",
      });
    }
    if (deviceId1 === deviceId2) {
      return res.status(400).json({
        message: "Cannot compare the same device",
      });
    }
    const device1 = await Device.findById(deviceId1);
    const device2 = await Device.findById(deviceId2);

    if (!device1 || !device2) {
      return res.status(404).json({
        message: "One or both devices not found",
      });
    }

    const deviceData1 = {
      title: device1.title,
      brand: device1.brand,
      category: device1.category,
      condition: device1.condition,
      yearOfManufacture: device1.yearOfManufacture,
      specifications: device1.specifications ?? device1.specs ?? {},
      description: device1.description,
      pricePerDay: device1.pricePerDay,
    };

    const deviceData2 = {
      title: device2.title,
      brand: device2.brand,
      category: device2.category,
      condition: device2.condition,
      yearOfManufacture: device2.yearOfManufacture,
      specifications: device2.specifications ?? device2.specs ?? {},
      description: device2.description,
      pricePerDay: device2.pricePerDay,
    };

    const prompt = `
You are an AI technology expert for TechShare, a technology device rental platform.

Your task is to compare two technology devices and help users choose the most suitable device for their rental needs.

Device 1:
${JSON.stringify(deviceData1)}

Device 2:
${JSON.stringify(deviceData2)}

Please compare these two devices based on the following criteria:

1. Brand and model
2. Technical specifications (CPU, RAM, storage, display)
3. Camera and sensors
4. Battery capacity
5. Weight
6. Rental price per day
7. Performance compared to rental price
8. Advantages and disadvantages
9. Overall recommendation

Rules:
- Use only the provided device information.
- Do not invent missing specifications.
- If information is missing, return "N/A".
- If the devices belong to different categories, explain their different use cases.
- Evaluate value for money based on available specifications and rental prices.
- Do not invent benchmark scores or numerical performance ratings.
- Keep explanations short, clear, and easy to understand.
- Return the response in English.
- Return ONLY valid JSON, without Markdown formatting.

JSON response format:

{
  "specifications": [
    {
      "label": "Processor",
      "device1": "Processor of device 1",
      "device2": "Processor of device 2"
    },
    {
      "label": "RAM",
      "device1": "RAM of device 1",
      "device2": "RAM of device 2"
    },
    {
      "label": "Battery",
      "device1": "Battery of device 1",
      "device2": "Battery of device 2"
    },
    {
      "label": "Camera / Sensors",
      "device1": "Camera and sensors of device 1",
      "device2": "Camera and sensors of device 2"
    },
    {
      "label": "Weight",
      "device1": "Weight of device 1",
      "device2": "Weight of device 2"
    },
    {
      "label": "Rental Price",
      "device1": "Rental price per day of device 1",
      "device2": "Rental price per day of device 2"
    },
    {
      "label": "Performance / Price",
      "device1": "Value for money assessment",
      "device2": "Value for money assessment"
    }
  ],
  "advantages": {
    "device1": [],
    "device2": []
  },
  "disadvantages": {
    "device1": [],
    "device2": []
  },
  "recommendation": {
    "winner": "device1",
    "reason": "Explain why this device is recommended"
  }
}

The recommendation winner must be "device1", "device2", or "tie".
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response");
    }

    const comparison = JSON.parse(response.text);
    return res.status(200).json({
      message: "Devices compared successfully",
      comparison,
    });
  } catch (error) {
     console.log("AI Compare Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
      error: error.message,
    });
  }
};
