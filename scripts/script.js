import "../styles/style.css";
// import "../styles/fontawesome/css/all.min.css";
import OpenAI from "openai";

// Global state
let isLoading = true;
let mediaRecorder;
let chunks = [];
let currentQuestionIndex = 0;
let recordedAnswers = [];
let countdownInterval;
let fakeAudioLevelsInterval;
let questions = [];

const maxRecordingTime = 59; // 60 seconds
const loader = document.querySelector(".interview-questions-loader");

// OpenAI configuration
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const description = `
Job Summary:
We are seeking a skilled Front-End Web Developer to join our development team. The ideal candidate will have a strong understanding of web technologies, a keen eye for design, and the ability to translate designs into responsive, user-friendly web applications.

Key Responsibilities:
- Develop and maintain responsive web applications
- Translate UI/UX designs into functional web pages
- Optimize web applications for performance
- Ensure cross-browser compatibility
- Write clean, maintainable code
- Participate in code reviews

Required Skills:
- Proficiency in HTML5, CSS3, and JavaScript
- Experience with modern front-end frameworks
- Knowledge of responsive design principles
- Experience with version control systems
- Strong problem-solving skills
`;

const questionsType =
  "personal questions related to the job description, questions related to behaviors, and questions related to employment.";
const questionsLanguage = "English";

// Function to get questions from AI
const getQuestionsFromAi = async () => {
  try {
    handleShowLoading(true);
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `Act as an HR expert and create 10 interview questions based on this job description: ${description}. Include a mix of ${questionsType}. Questions should be in ${questionsLanguage}. Return the response as a JSON array with 'question' field only.(note that: the first question will be: Talk about your self in English)`,
        },
      ],
      temperature: 0.7,
    });

    const answer = response?.choices[0]?.message?.content;
    try {
      questions = JSON.parse(answer);
    } catch (e) {
      // Fallback in case of parsing error
      questions = [
        {
          question: "Tell me about your experience with front-end development.",
        },
      ];
      console.error("Error parsing AI response:", e);
    }

    handleShowLoading(false);
    return questions;
  } catch (error) {
    console.error("Error getting questions:", error);
    handleShowLoading(false);
    return [];
  }
};

// Function to handle the recorded audio blob
async function handleRecordedAudio(audioBlob) {
  try {
    handleShowLoading(true);
    // Convert speech to text using OpenAI Whisper
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to transcribe audio");
    }

    const data = await response.json();

    // Store the transcribed text
    recordedAnswers.push({
      question: questions[currentQuestionIndex].question,
      answer: data.text,
    });

    // Move to next question or analyze if all questions are answered
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
      await analyzeResponses();
    } else {
      updateQuestion();
    }

    handleShowLoading(false);
  } catch (error) {
    console.error("Error processing audio:", error);
    alert("Error processing audio. Please try again.");
    handleShowLoading(false);
  }
}

// Function to analyze all responses
async function analyzeResponses() {
  try {
    handleShowLoading(true);
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an HR expert analyzing interview responses for a front-end developer position. Provide a comprehensive analysis of the candidate's technical qualifications and soft skills.",
        },
        {
          role: "user",
          content: `Please analyze these interview responses for a front-end developer position. Assess technical competency, communication skills, and overall fit. Questions and answers: ${JSON.stringify(
            recordedAnswers,
            null,
            2
          )}`,
        },
      ],
      temperature: 0.7,
    });

    // Display the analysis
    const analysisResult = document.getElementById("analysisResult");
    const questionsContainer = document.querySelector(
      ".interview-questions-container"
    );

    if (analysisResult && questionsContainer) {
      analysisResult.innerHTML = `
        <h3>Interview Analysis</h3>
        <div class="analysis-content">
          ${response.choices[0].message.content}
        </div>
      `;

      // Update UI to show completion
      questionsContainer.style.display = "none";
      analysisResult.style.display = "block";
    }

    handleShowLoading(false);
  } catch (error) {
    console.error("Error analyzing responses:", error);
    alert("Error analyzing responses. Please try again.");
    handleShowLoading(false);
  }
}

// Update question dynamically
function updateQuestion() {
  const questionText = document.querySelector(".questions-question p");
  const questionHeader = document.querySelector(".questions-question h3");

  if (currentQuestionIndex < questions.length) {
    questionHeader.textContent = `Question ${currentQuestionIndex + 1}`;
    questionText.textContent = questions[currentQuestionIndex].question;
  } else {
    analyzeResponses();
  }
}

// Utility functions
const handleShowLoading = (isLoading) => {
  if (isLoading) {
    loader.classList.add("active");
  } else {
    loader.classList.remove("active");
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  // DOM References
  const recordButton = document.querySelector(".answers-recording-button");
  const timerDisplay = document.querySelector(".answers-recording-timer");
  const recordingIndicator = document.querySelector(
    ".answers-recording-indicator"
  );

  // Initialize questions and first question
  try {
    questions = await getQuestionsFromAi();
    if (questions.length === 0) {
      throw new Error("No questions received from AI");
    }
    updateQuestion();
  } catch (error) {
    console.error("Error initializing questions:", error);
    alert("Error loading questions. Please refresh the page.");
    return;
  }

  // Starts the countdown and updates the timer display
  const startCountdown = (callback) => {
    let timeLeft = maxRecordingTime;
    timerDisplay.innerHTML = `<i class="fa-solid fa-stopwatch"></i> Time Left: ${timeLeft}s`;

    countdownInterval = setInterval(() => {
      timeLeft -= 1;
      timerDisplay.innerHTML = `<i class="fa-solid fa-stopwatch"></i> Time Left: ${timeLeft}s`;

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        callback(); // Stop recording when countdown ends
      }
    }, 1000);
  };

  // Toggles the recording animation
  const toggleRecordingAnimation = (isRecording) => {
    if (isRecording) {
      recordButton.classList.add("recording");
    } else {
      recordButton.classList.remove("recording");
    }
  };

  // Updates recording indicator
  const updateRecordingIndicator = (audioLevel) => {
    recordingIndicator.innerHTML = "";
    for (let i = 0; i < 20; i++) {
      const bar = document.createElement("div");
      const height = Math.random() * (audioLevel + 1) * 10;
      bar.style.height = `${Math.min(height, 100)}px`;
      bar.style.backgroundColor = "#DEDEDE";
      bar.style.margin = "0 2px";
      bar.style.width = "10px";
      bar.style.borderRadius = "500px";
      recordingIndicator.appendChild(bar);
    }
  };

  // Starts recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        await handleRecordedAudio(audioBlob);
      };

      mediaRecorder.start();
      toggleRecordingAnimation(true);

      fakeAudioLevelsInterval = setInterval(() => {
        const level = Math.random() * 100;
        updateRecordingIndicator(level);
      }, 100);

      startCountdown(() => {
        stopRecording();
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Please allow microphone access to record.");
    }
  };

  // Stops recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      toggleRecordingAnimation(false);
      clearInterval(countdownInterval);
      clearInterval(fakeAudioLevelsInterval);

      timerDisplay.innerHTML = `<i class="fa-solid fa-stopwatch"></i> 60 seconds`;
      recordingIndicator.innerHTML = "";
      recordButton.innerHTML =
        "Start Recording <i class='fa-solid fa-circle'></i>";
    }
  };

  // Event listener for the recording button
  recordButton.addEventListener("click", () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      recordButton.innerHTML =
        "Stop Recording <i class='fa-solid fa-circle'></i>";
      startRecording();
    } else {
      stopRecording();
    }
  });
});
