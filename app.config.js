import 'dotenv/config';

export default {
  expo: {
    name: "my-app",
    slug: "my-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.myapp",
      associatedDomains: ["applinks:*.ngrok-free.app"]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourcompany.myapp",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "myapp",
              host: "stripe-connect-success",
            },
            {
              scheme: "myapp",
              host: "stripe-connect-failure",
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      stripeClientId: process.env.STRIPE_CLIENT_ID,
      stripeOAuthRedirectUri: process.env.STRIPE_REDIRECT_URI,
      stripePubKey: process.env.STRIPE_PUB_KEY,
        eas: {
          projectId: "e8a88595-2bcb-4b64-978a-b6e247a3beed"
      }
    },
    plugins: 
      [
        "expo-location",
        "expo-web-browser",
        "expo-font"
      ],
    scheme: "myapp",
    platforms: ["ios", "android"]
  }
}; 