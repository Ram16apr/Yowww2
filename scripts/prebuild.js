const fs = require("fs");
const path = require("path");

const filePath = path.resolve("./android/app/google-services.json");

if (process.env.EXPO_ANDROID_GOOGLE_SERVICES_JSON) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFileSync(
    filePath,
    process.env.EXPO_ANDROID_GOOGLE_SERVICES_JSON
  );

  console.log("google-services.json created successfully");
} else {
  console.log("ENV NOT FOUND");
}