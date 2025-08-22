const { describe, test, expect } = require('@jest/globals');
const { WolfStateMachine } = require('../src/ai/wolf/state-machine.js');
const { WolfState } = require('../src/ai/wolf/config.js');

describe('WolfStateMachine context cleanup', () => {
    test('resets wasHurt flag when leaving HURT state', () => {
        const context = { wasHurt: true };
        const sm = new WolfStateMachine(WolfState.HURT, context);
        sm.transitionTo(WolfState.IDLE);
        expect(context.wasHurt).toBe(false);
    });

    test('resets isStunned flag when leaving STUNNED state', () => {
        const context = { isStunned: true };
        const sm = new WolfStateMachine(WolfState.STUNNED, context);
        sm.transitionTo(WolfState.IDLE);
        expect(context.isStunned).toBe(false);
    });

    test('onExit handlers do not throw when context is missing', () => {
        const smHurt = new WolfStateMachine(WolfState.HURT);
        const smStunned = new WolfStateMachine(WolfState.STUNNED);
        expect(() => smHurt.transitionTo(WolfState.IDLE)).not.toThrow();
        expect(() => smStunned.transitionTo(WolfState.IDLE)).not.toThrow();
    });
});

