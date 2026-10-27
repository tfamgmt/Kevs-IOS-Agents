import assert from 'node:assert/strict';
import test from 'node:test';

import {
    appInstallCheck, appsToTouchCheck, checksAllowFinalize,
    type RegistrationCheck, type RegistrationCheckName, type RegistrationCheckState,
} from '../src/devices/registration.js';

const names: RegistrationCheckName[] = [
    'host', 'connection', 'signing', 'developer', 'wda', 'appium', 'video', 'touch', 'tiktok', 'instagram', 'accounts',
];

function checks(overrides: Partial<Record<RegistrationCheckName, RegistrationCheckState>> = {}): Record<RegistrationCheckName, RegistrationCheck> {
    return Object.fromEntries(names.map((name) => [
        name, { state: overrides[name] ?? 'passed', message: '', updatedAt: '' },
    ])) as Record<RegistrationCheckName, RegistrationCheck>;
}

test('an installed app passes', () => {
    assert.equal(appInstallCheck('TikTok', true, 'com.zhiliaoapp.musically', []).state, 'passed');
    assert.equal(appInstallCheck('Instagram', true, 'com.burbn.instagram', []).state, 'passed');
});

test('a missing app with no accounts is skipped, not blocking', () => {
    for (const app of ['TikTok', 'Instagram']) {
        const result = appInstallCheck(app, false, 'bundle', []);
        assert.equal(result.state, 'skipped');
        assert.match(result.message, /optional/);
    }
});

test('a missing app blocks when accounts are configured for it', () => {
    assert.equal(appInstallCheck('Instagram', false, 'com.burbn.instagram', ['@someone']).state, 'blocked');
});

test('a device with no social app ready can finish registration', () => {
    assert.equal(checksAllowFinalize(checks({ tiktok: 'skipped' })), true);
    assert.equal(checksAllowFinalize(checks({ instagram: 'skipped' })), true);
    assert.equal(checksAllowFinalize(checks({ tiktok: 'skipped', instagram: 'skipped' })), true);
    assert.equal(checksAllowFinalize(checks()), true);
});

test('runtime checks and blocked apps still stop registration', () => {
    assert.equal(checksAllowFinalize(checks({ tiktok: 'skipped', instagram: 'blocked' })), false);
    assert.equal(checksAllowFinalize(checks({ tiktok: 'skipped', touch: 'checking' })), false);
    assert.equal(checksAllowFinalize(checks({ touch: 'skipped' })), false);
    assert.equal(checksAllowFinalize(checks({ accounts: 'skipped' })), false);
});

test('app taps run only for installed apps with configured accounts', () => {
    const none = { tiktok: [], instagram: [] };
    assert.deepEqual(appsToTouchCheck({ tiktok: false, instagram: true }, none), []);
    assert.deepEqual(appsToTouchCheck({ tiktok: true, instagram: true }, none), []);
    assert.deepEqual(appsToTouchCheck({ tiktok: false, instagram: true }, { tiktok: [], instagram: ['@me'] }), ['instagram']);
    assert.deepEqual(appsToTouchCheck({ tiktok: true, instagram: true }, { tiktok: ['@a'], instagram: ['@b'] }), ['tiktok', 'instagram']);
    assert.deepEqual(appsToTouchCheck({ tiktok: false, instagram: false }, { tiktok: ['@a'], instagram: [] }), []);
});
