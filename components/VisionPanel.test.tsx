import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VisionPanel } from './VisionPanel';
import assert from 'node:assert';
import test, { describe, it, afterEach } from 'node:test';
import { JSDOM } from 'jsdom';

// Setup basic JSDOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

describe('VisionPanel', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders offline message when previewImage is null', () => {
        const { getByText } = render(<VisionPanel previewImage={null} onClear={() => {}} />);
        assert.ok(getByText('Vision Matrix Offline'));
    });

    it('renders correctly when previewImage is provided', () => {
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const { getByRole, getByText } = render(<VisionPanel previewImage={testImage} onClear={() => {}} />);

        const img = getByRole('img');
        assert.strictEqual((img as HTMLImageElement).src, testImage);

        assert.ok(getByText('Visual Input Buffer'));
    });

    it('calls onClear when discard button is clicked', () => {
        let cleared = false;
        const testImage = 'test-image.png';
        const { getByRole } = render(<VisionPanel previewImage={testImage} onClear={() => { cleared = true; }} />);

        const button = getByRole('button');
        fireEvent.click(button);

        assert.strictEqual(cleared, true);
    });
});
