// services/applicationService.js

export async function submitApplication(formData) {
  const response = await fetch("http://127.0.0.1:8000/api/application", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    throw new Error("Failed to submit application");
  }

  return response.json();
}