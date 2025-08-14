import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Session management
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10),
  tempStoragePath: process.env.TEMP_STORAGE_PATH || './temp-storage',
  
  // File handling
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  
  // TTS services (optional)
  tts: {
    googleApiKey: process.env.GOOGLE_TTS_API_KEY,
    azureApiKey: process.env.AZURE_TTS_API_KEY,
    azureRegion: process.env.AZURE_TTS_REGION || 'eastus',
    timeout: parseInt(process.env.TTS_TIMEOUT || '3000', 10),
    audioOutputFormat: process.env.AUDIO_OUTPUT_FORMAT || 'mp3'
  }
};

// Validation
if (config.nodeEnv === 'production') {
  const requiredVars = ['PORT', 'CORS_ORIGIN'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}