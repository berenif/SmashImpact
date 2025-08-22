// Wrapper for game_engine.js to fix SES compatibility issues
import GameEngineModule from './game_engine.js';

// Export the module in a way that's compatible with SES
export default GameEngineModule;

// Also export as a named export for compatibility
export { GameEngineModule };
