const DEFAULT_DIRS_URL = 'http://tnas.local:3300/api/dirs';
const DEFAULT_UPLOAD_URL = 'http://tnas.local:3300/api/upload';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'fetchDirs') {
        chrome.storage.sync.get({
            dirsUrl: DEFAULT_DIRS_URL,
            token: ''
        }, function(settings) {
            const dirsUrlWithToken = `${settings.dirsUrl}?token=${encodeURIComponent(settings.token)}`;
            console.log('Using dirs URL:', dirsUrlWithToken);
            
            fetch(dirsUrlWithToken)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch directories');
                    }
                    return response.json();
                })
                .then(data => sendResponse({ success: true, data }))
                .catch(error => sendResponse({ success: false, error: error.message }));
        });
        return true;
    } 
    else if (request.action === 'downloadTorrent') {
        fetch(request.torrentUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to download torrent file');
                }
                return response.arrayBuffer();
            })
            .then(data => {
                return sendResponse({ success: true, data: Array.from(new Uint8Array(data)) });
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    } 
    else if (request.action === 'uploadTorrent') {
        chrome.storage.sync.get({
            uploadUrl: DEFAULT_UPLOAD_URL,
            token: ''
        }, function(settings) {
            const uploadUrlWithToken = `${settings.uploadUrl}?token=${encodeURIComponent(settings.token)}`;
            console.log('Using upload URL:', uploadUrlWithToken);
            
            console.log('Uploading torrent:', {
                filename: request.filename,
                directory: request.directory,
                dataLength: request.torrentData.length
            });
            
            const torrentBlob = new Blob([new Uint8Array(request.torrentData)], 
                                       { type: 'application/x-bittorrent' });
            const torrentFile = new File([torrentBlob], request.filename, 
                                       { type: 'application/x-bittorrent' });
            
            const formData = new FormData();
            formData.append('directory', request.directory);
            formData.append('torrent', torrentFile);
            
            console.log("FormData contents:");
            for (let [key, value] of formData.entries()) {
                console.log(`- ${key}: ${value instanceof File ? value.name : value}`);
            }
            
            fetch(uploadUrlWithToken, {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    console.log('Upload response status:', response.status);
                    return response.text().then(text => {
                        console.log('Response text:', text);
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            throw new Error('Invalid server response: ' + text);
                        }
                    });
                })
                .then(data => {
                    console.log('Upload success:', data);
                    sendResponse({ success: true, data });
                })
                .catch(error => {
                    console.error('Upload error:', error);
                    sendResponse({ success: false, error: error.message });
                });
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.get({
        dirsUrl: null,
        uploadUrl: null,
        token: null
    }, function(items) {
        const updates = {};
        if (items.dirsUrl === null) updates.dirsUrl = DEFAULT_DIRS_URL;
        if (items.uploadUrl === null) updates.uploadUrl = DEFAULT_UPLOAD_URL;
        if (items.token === null) updates.token = '';
        if (Object.keys(updates).length > 0) {
            chrome.storage.sync.set(updates);
        }
    });
});

console.log('Background script loaded');