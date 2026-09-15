const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  const env = { ...process.env };

  if (!fs.existsSync(filePath)) {
    return env;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

const env = loadEnv(path.resolve(__dirname, '..', '.env'));
const required = [
  'GOOGLE_SERVICES_ANDROID_API_KEY',
  'GOOGLE_SERVICES_ANDROID_MOBILESDK_APP_ID',
  'GOOGLE_SERVICES_ANDROID_CLIENT_ID',
  'GOOGLE_SERVICES_PACKAGE_NAME',
  'GOOGLE_SERVICES_PROJECT_ID',
  'GOOGLE_SERVICES_STORAGE_BUCKET',
  'GOOGLE_SERVICES_PROJECT_NUMBER',
];

const missing = required.filter((key) => !env[key]);
if (missing.length > 0) {
  console.error('Missing required Google services environment variables:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

const config = {
  project_info: {
    project_number: env.GOOGLE_SERVICES_PROJECT_NUMBER,
    project_id: env.GOOGLE_SERVICES_PROJECT_ID,
    storage_bucket: env.GOOGLE_SERVICES_STORAGE_BUCKET,
  },
  client: [
    {
      client_info: {
        mobilesdk_app_id: env.GOOGLE_SERVICES_ANDROID_MOBILESDK_APP_ID,
        android_client_info: {
          package_name: env.GOOGLE_SERVICES_PACKAGE_NAME,
        },
      },
      oauth_client: [
        {
          client_id: env.GOOGLE_SERVICES_ANDROID_CLIENT_ID,
          client_type: 3,
        },
      ],
      api_key: [
        {
          current_key: env.GOOGLE_SERVICES_ANDROID_API_KEY,
        },
      ],
      services: {
        appinvite_service: {
          other_platform_oauth_client: [
            {
              client_id: env.GOOGLE_SERVICES_ANDROID_CLIENT_ID,
              client_type: 3,
            },
          ],
        },
      },
    },
  ],
  configuration_version: '1',
};

const rootDir = path.resolve(__dirname, '..');
const outputs = ['google-services.json', path.join('android', 'app', 'google-services.json')];

for (const relativePath of outputs) {
  const filePath = path.join(rootDir, relativePath);
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Generated ${relativePath}`);
}
