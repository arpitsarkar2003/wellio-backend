const { google } = require("googleapis");
const axios = require("axios");

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);

const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

async function getAccessToken() {
  const jwtClient = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    SCOPES
  );
  const token = await jwtClient.authorize();
  return token.access_token;
}

async function sendNotification(fcmToken, title, body, data = {}) {
  try {
    if (!fcmToken) throw new Error("FCM token is required");

    const accessToken = await getAccessToken();

    const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    const payload = {
      message: {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("✔️ Notification sent:", response.data);
    return { success: true };
  } catch (err) {
    console.error("❌ FCM Error:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendNotification };
