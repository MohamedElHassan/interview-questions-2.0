import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI("AIzaSyAlcdqxCAzIWXvQDdS6lZTqzBbzK5-fYW0");

// Get the generative model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function getQuestionsFromGemini(description, questionsType, questionsLanguage) {
  try {
    const prompt = `Act as an HR expert and create 10 interview questions based on this job description: ${description}. Include a mix of ${questionsType}. Questions should be in ${questionsLanguage}. Return the response as a JSON array with 'question' field only.(note that: the first question will be: Talk about your self in English)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Error parsing Gemini response:", e);
      return [{
        question: "Tell me about your experience with front-end development."
      }];
    }
  } catch (error) {
    console.error("Error getting questions from Gemini:", error);
    return [];
  }
}
