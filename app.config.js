export default ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON
        ? "./android/app/google-services.json"
        : undefined,
    },
  };
};