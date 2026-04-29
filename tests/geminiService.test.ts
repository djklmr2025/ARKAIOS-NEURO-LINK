import '../setup-mock.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MessageRole, Message } from '../types';

// Declare globals for the mock
declare global {
  var generateContentCalls: any[];
  var throwError: boolean;
}

global.generateContentCalls = [];
global.throwError = false;

import { sendNeuralMessage } from '../services/geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    global.generateContentCalls = [];
    global.throwError = false;
  });

  it('should format a basic text message correctly', async () => {
    const history: Message[] = [];
    const prompt = "Hello World";

    await sendNeuralMessage(history, prompt);

    assert.strictEqual(global.generateContentCalls.length, 1);
    const callArgs = global.generateContentCalls[0];

    assert.strictEqual(callArgs.model, 'gemini-2.5-flash');
    assert.strictEqual(callArgs.contents.role, 'user');
    assert.strictEqual(callArgs.contents.parts.length, 1);
    assert.strictEqual(callArgs.contents.parts[0].text, "Hello World");
  });

  it('should format a message with an image correctly', async () => {
    const history: Message[] = [];
    const prompt = "What is this image?";
    const imageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    await sendNeuralMessage(history, prompt, imageBase64);

    assert.strictEqual(global.generateContentCalls.length, 1);
    const callArgs = global.generateContentCalls[0];
    assert.strictEqual(callArgs.contents.parts.length, 2);

    const imagePart = callArgs.contents.parts.find((p: any) => p.inlineData);
    assert.ok(imagePart);
    assert.strictEqual(imagePart.inlineData.mimeType, 'image/png');
    assert.strictEqual(imagePart.inlineData.data, "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");

    const textPart = callArgs.contents.parts.find((p: any) => p.text);
    assert.ok(textPart);
    assert.strictEqual(textPart.text, prompt);
  });

  it('should include history correctly', async () => {
    const history: Message[] = [
      { id: '1', role: MessageRole.USER, text: 'Hi', timestamp: 0 },
      { id: '2', role: MessageRole.MODEL, text: 'Hello, how can I help?', timestamp: 1 }
    ];
    const prompt = "I need help with a file";

    await sendNeuralMessage(history, prompt);

    assert.strictEqual(global.generateContentCalls.length, 1);
    const callArgs = global.generateContentCalls[0];

    const textPart = callArgs.contents.parts.find((p: any) => p.text);
    assert.ok(textPart);
    assert.ok(textPart.text.includes('PREVIOUS CONTEXT:'));
    assert.ok(textPart.text.includes('[USER]: Hi'));
    assert.ok(textPart.text.includes('[MODEL]: Hello, how can I help?'));
    assert.ok(textPart.text.includes('CURRENT REQUEST:\nI need help with a file'));
  });

  it('should handle tool responses correctly', async () => {
    const history: Message[] = [];
    const prompt = null;
    const toolResponses = [
      {
        functionResponse: {
          name: 'list_files',
          response: { files: ['index.html', 'main.js'] }
        }
      }
    ];

    await sendNeuralMessage(history, prompt, undefined, toolResponses);

    assert.strictEqual(global.generateContentCalls.length, 1);
    const callArgs = global.generateContentCalls[0];

    assert.strictEqual(callArgs.contents.role, 'function');
    assert.strictEqual(callArgs.contents.parts.length, 1);
    assert.deepStrictEqual(callArgs.contents.parts[0], toolResponses[0]);
  });

  it('should handle history when there are no text parts but parts exist', async () => {
    const history: Message[] = [
      { id: '1', role: MessageRole.USER, text: 'Hi', timestamp: 0 },
    ];
    const prompt = null;
    const imageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    await sendNeuralMessage(history, prompt, imageBase64);

    assert.strictEqual(global.generateContentCalls.length, 1);
    const callArgs = global.generateContentCalls[0];

    assert.strictEqual(callArgs.contents.parts.length, 2);
    const textPart = callArgs.contents.parts.find((p: any) => p.text);
    assert.ok(textPart);
    assert.ok(textPart.text.includes('PREVIOUS CONTEXT:'));
    assert.ok(textPart.text.includes('[USER]: Hi'));
    assert.ok(textPart.text.includes('CURRENT REQUEST:\n (See attached image)'));
  });

  it('should throw an error if generateContent fails', async () => {
    global.throwError = true;

    const history: Message[] = [];
    const prompt = "Hello World";

    await assert.rejects(
      sendNeuralMessage(history, prompt),
      { message: "API Error" }
    );
  });
});
