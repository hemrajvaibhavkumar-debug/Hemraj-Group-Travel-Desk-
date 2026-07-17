import { uploadFileDirectly } from "./server/src/services/drive.service";
import { env } from "./server/src/config/env";

async function runTest() {
  console.log("=== GOOGLE DRIVE DIRECT UPLOAD TEST ===");
  console.log("Client ID:", env.GOOGLE_DRIVE_CLIENT_ID ? "Configured" : "MISSING");
  console.log("Client Secret:", env.GOOGLE_DRIVE_CLIENT_SECRET ? "Configured" : "MISSING");
  
  const token = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || env.GOOGLE_DRIVE_REFRESH_TOKEN;
  console.log("Refresh Token:", token ? `Configured (begins with ${token.substring(0, 10)}...)` : "MISSING");

  if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET || !token) {
    console.error("❌ Test aborted: You must configure all Google Drive credentials in your .env file or authorize it first.");
    process.exit(1);
  }

  // A tiny plain text file content ("Hello World from Antigravity Direct Google Drive Upload!")
  const testBase64 = "data:text/plain;base64,SGVsbG8gV29ybGQgZnJvbSBBbnRpZ3Jhdml0eSBEaXJlY3QgR29vZ2xlIERyaXZlIFVwbG9hZCE=";
  const fileName = `Test_Direct_Upload_${Date.now()}.txt`;
  const folderPath = "00_General_Uploads/TestUpload";

  console.log(`\nUploading test file: "${fileName}" to Google Drive folder: "${folderPath}"...`);

  const result = await uploadFileDirectly(
    fileName,
    testBase64,
    "text/plain",
    folderPath
  );

  if (result.success) {
    console.log("🚀 SUCCESS! File uploaded successfully.");
    console.log("🔗 Shareable Google Drive Link:", result.url);
  } else {
    console.error("❌ FAILED! Direct Google Drive upload returned failure.");
    console.error("⚠️ Error Message:", result.error);
  }
}

runTest().catch((err) => {
  console.error("Unexpected script execution error:", err);
});
