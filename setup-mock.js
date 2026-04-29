const Module = require('node:module');

const originalRequire = Module.prototype.require;

Module.prototype.require = function(request) {
  if (request === '@google/genai') {
    return {
      GoogleGenAI: class {
        models = {
          generateContent: async (args) => {
            if (global.throwError) {
              throw new Error("API Error");
            }
            global.generateContentCalls.push(args);
            return {
              text: () => "Mocked response text"
            };
          }
        };
      },
      Type: {
        OBJECT: 'OBJECT',
        STRING: 'STRING'
      }
    };
  }
  return originalRequire.apply(this, arguments);
};
