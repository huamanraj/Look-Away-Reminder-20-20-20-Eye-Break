
const DEFAULT_SETTINGS = {
    intervalMinutes: 10,
    breakSeconds: 20,
    soundEnabled: true,
    notificationsEnabled: true
};

const STATE = {
    running: false,
    nextTriggerAt: null,
    breakActiveUntil: null
};

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(async () => {
    await init();
});
chrome.runtime.onStartup.addListener(async () => {
    await init();
});

async function init() {
    const result = await chrome.storage.sync.get('settings');
    let settings = result.settings;
    if (!settings) {
        settings = DEFAULT_SETTINGS;
        await chrome.storage.sync.set({ settings });
    }

    const localState = await chrome.storage.local.get(['running', 'nextTriggerAt']);
    // Default to running if not set
    STATE.running = localState.running !== false;
    STATE.nextTriggerAt = localState.nextTriggerAt;

    if (STATE.running) {
        // Check if alarm exists, if not create it
        const alarm = await chrome.alarms.get('reminder_loop');
        if (!alarm) {
            await setupAlarm(settings.intervalMinutes);
        }
    }
}

// Helper: Setup Alarm
async function setupAlarm(intervalMinutes) {
    await chrome.alarms.clear('reminder_loop');
    chrome.alarms.create('reminder_loop', {
        delayInMinutes: intervalMinutes,
        periodInMinutes: intervalMinutes
    });

    STATE.nextTriggerAt = Date.now() + intervalMinutes * 60 * 1000;
    await chrome.storage.local.set({ running: true, nextTriggerAt: STATE.nextTriggerAt });
    STATE.running = true;
}

// Helper: Stop Alarm
async function stopAlarm() {
    await chrome.alarms.clear('reminder_loop');
    STATE.running = false;
    STATE.nextTriggerAt = null;
    await chrome.storage.local.set({ running: false, nextTriggerAt: null });
}

// Alarm Handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'reminder_loop') {
        await triggerReminder();
    }
});

async function triggerReminder() {
    const data = await chrome.storage.sync.get('settings');
    const settings = data.settings || DEFAULT_SETTINGS;

    // Update State for next loop
    STATE.nextTriggerAt = Date.now() + settings.intervalMinutes * 60 * 1000;
    STATE.breakActiveUntil = Date.now() + settings.breakSeconds * 1000;

    // Persist trigger time, but breakActiveUntil is mostly transient for UI, 
    // though persisting it helps popup know if break is active upon opening.
    await chrome.storage.local.set({
        nextTriggerAt: STATE.nextTriggerAt,
        breakActiveUntil: STATE.breakActiveUntil
    });

    // Notification
    if (settings.notificationsEnabled) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Look away',
            message: `Take a ${settings.breakSeconds} second break! Look at something 20 feet away.`,
            priority: 2
        });
    }

    // Sound
    if (settings.soundEnabled) {
        await playSound();
    }

    // Use a timeout to clear break active state in storage? 
    // Not strictly necessary for background but good for cleanup.
    // Although service worker might go inactive, so reliance on storage is better.
}

async function playSound() {
    try {
        // Create offscreen if needed
        const existingContexts = await chrome.runtime.getContexts({});
        const offscreen = existingContexts.find(c => c.contextType === 'OFFSCREEN_DOCUMENT');

        if (!offscreen) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Play reminder sound',
            });
        }

        chrome.runtime.sendMessage({ target: 'offscreen', action: 'play_sound' });
    } catch (e) {
        console.error("Audio playback failed", e);
    }
}


// Message Dispatcher
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
        if (msg.action === 'getStatus') {
            const settings = (await chrome.storage.sync.get('settings')).settings || DEFAULT_SETTINGS;
            // Also re-read local state to be sure
            const local = await chrome.storage.local.get(['nextTriggerAt', 'breakActiveUntil']);

            sendResponse({
                running: STATE.running,
                settings: settings,
                nextTriggerAt: local.nextTriggerAt || STATE.nextTriggerAt,
                breakActiveUntil: local.breakActiveUntil
            });
        } else if (msg.action === 'toggleRunning') {
            const settings = (await chrome.storage.sync.get('settings')).settings || DEFAULT_SETTINGS;
            if (STATE.running) {
                await stopAlarm();
            } else {
                await setupAlarm(settings.intervalMinutes);
            }
            sendResponse(await getStatusPayload());
        } else if (msg.action === 'testReminder') {
            await triggerReminder();
            sendResponse({ success: true });
        } else if (msg.action === 'updateSettings') {
            await chrome.storage.sync.set({ settings: msg.settings });
            if (STATE.running) {
                // Restart alarm with new interval
                await setupAlarm(msg.settings.intervalMinutes);
            }
            sendResponse({ success: true });
        }
    })();
    return true; // Keep channel open
});

async function getStatusPayload() {
    const settings = (await chrome.storage.sync.get('settings')).settings || DEFAULT_SETTINGS;
    const local = await chrome.storage.local.get(['nextTriggerAt', 'breakActiveUntil']);
    return {
        running: STATE.running,
        settings: settings,
        nextTriggerAt: local.nextTriggerAt,
        breakActiveUntil: local.breakActiveUntil
    };
}
