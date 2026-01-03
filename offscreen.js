chrome.runtime.onMessage.addListener(msg => {
    if (msg.target === 'offscreen' && msg.action === 'play_sound') {
        const audio = new Audio(chrome.runtime.getURL('assets/chime.mp3'));
        audio.play().catch(e => console.error("Audio play error", e));
    }
});
